import type { Database, SqlJsStatic } from 'sql.js';

// sql.js 通过 CDN <script> 加载，全局函数名即 initSqlJs
declare const initSqlJs: (config: { locateFile: (f: string) => string }) => Promise<SqlJsStatic>;

// ── IndexedDB 常量 ────────────────────────────────────────────
const IDB_NAME    = 'rfmatrix_storage';
const IDB_VERSION = 1;
const STORE_NAME  = 'databases';
const DB_KEY      = 'rfmatrix_db_v1';
const LS_KEY      = 'rfmatrix_db_v1'; // 旧版 localStorage key，用于迁移

let db: Database | null = null;

// ── IndexedDB 工具函数 ────────────────────────────────────────
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbLoad(): Promise<Uint8Array | null> {
  try {
    const idb = await openIDB();
    return await new Promise<Uint8Array | null>((resolve) => {
      const req = idb.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(DB_KEY);
      req.onsuccess = () => { idb.close(); resolve((req.result as Uint8Array) ?? null); };
      req.onerror   = () => { idb.close(); resolve(null); };
    });
  } catch { return null; }
}

async function idbSave(bytes: Uint8Array): Promise<void> {
  try {
    const idb = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const req = idb.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(bytes, DB_KEY);
      req.onsuccess = () => { idb.close(); resolve(); };
      req.onerror   = () => { idb.close(); reject(req.error); };
    });
  } catch { /* ignore */ }
}

async function idbClear(): Promise<void> {
  try {
    const idb = await openIDB();
    await new Promise<void>((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(DB_KEY);
      tx.oncomplete = () => { idb.close(); resolve(); };
      tx.onerror    = () => { idb.close(); resolve(); };
    });
  } catch { /* ignore */ }
}

// ── 公开 API ──────────────────────────────────────────────────

/** 将当前内存 DB 序列化到 IndexedDB（异步写入，不阻塞调用方） */
export function saveDB(database: Database): void {
  idbSave(database.export()).catch(() => {});
}

/** 清除持久化数据（可用于重置测试数据） */
export async function clearDBCache(): Promise<void> {
  await idbClear();
  localStorage.removeItem(LS_KEY); // 同时清理旧版 localStorage
}

export async function initDB(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`,
  });

  // 1. 优先从 IndexedDB 加载
  const idbBytes = await idbLoad();
  if (idbBytes) {
    try {
      db = new SQL.Database(idbBytes);
      console.log('DB loaded from IndexedDB, satellites:',
        db.exec('SELECT COUNT(*) FROM satellite_basic_info')[0]?.values[0][0]);
      return db;
    } catch {
      await idbClear();
      console.warn('IndexedDB data corrupted, falling back');
    }
  }

  // 2. 迁移旧版 localStorage 数据
  const lsSaved = localStorage.getItem(LS_KEY);
  if (lsSaved) {
    try {
      const binaryStr = atob(lsSaved);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      db = new SQL.Database(bytes);
      await idbSave(bytes);          // 迁移到 IndexedDB
      localStorage.removeItem(LS_KEY); // 清除旧版缓存
      console.log('DB migrated from localStorage → IndexedDB');
      return db;
    } catch {
      localStorage.removeItem(LS_KEY);
      console.warn('localStorage cache corrupted, re-initializing from SQL file');
    }
  }

  // 3. 从 SQL 文件初始化（首次使用）
  const response = await fetch('/sql/rfmatrix_complete.sql', { cache: 'no-cache' });
  if (!response.ok) throw new Error('无法加载 SQL 文件');
  const sqlText = await response.text();

  db = new SQL.Database();
  const cleaned = preprocessSQL(sqlText);

  // 按语句拆分后逐条执行，遇到错误跳过（容错）
  const statements = cleaned
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      db.run(stmt);
    } catch {
      // 忽略单条语句错误，继续执行
    }
  }

  console.log(
    'DB ready from SQL file, satellites:',
    db.exec('SELECT COUNT(*) FROM satellite_basic_info')[0]?.values[0][0],
  );

  // 首次初始化后保存到 IndexedDB
  await idbSave(db.export());

  return db;
}

export function getDB(): Database {
  if (!db) throw new Error('DB not initialized');
  return db;
}

function preprocessSQL(sql: string): string {
  return (
    sql
      // 移除注释行（-- ...）
      .replace(/--[^\n]*/g, '')
      // SET 语句
      .replace(/SET\s+NAMES\s+\S+\s*;/gi, '')
      .replace(/SET\s+FOREIGN_KEY_CHECKS\s*=\s*[01]\s*;/gi, '')
      // ENGINE / CHARSET / COLLATE / ROW_FORMAT / AUTO_INCREMENT=N / COMMENT=
      .replace(/ENGINE\s*=\s*\w+/gi, '')
      .replace(/DEFAULT\s+CHARSET\s*=\s*\w+/gi, '')
      .replace(/CHARACTER\s+SET\s*=?\s*\w+/gi, '')
      .replace(/COLLATE\s*=?\s*[\w_]+/gi, '')
      .replace(/ROW_FORMAT\s*=\s*\w+/gi, '')
      .replace(/AUTO_INCREMENT\s*=\s*\d+/gi, '')
      .replace(/\bCOMMENT\s*=\s*'[^']*'/gi, '')
      // 字段内联 COMMENT
      .replace(/\bCOMMENT\s+'[^']*'/gi, '')
      // AUTO_INCREMENT → 去掉（SQLite 自增靠 INTEGER PRIMARY KEY）
      .replace(/\bAUTO_INCREMENT\b/gi, '')
      // USING BTREE
      .replace(/USING\s+BTREE/gi, '')
      // 数据类型转换
      .replace(/\btinyint\(\d+\)/gi, 'INTEGER')
      .replace(/\btinyint\b/gi, 'INTEGER')
      .replace(/\bsmallint\(\d+\)/gi, 'INTEGER')
      .replace(/\bint\(\d+\)/gi, 'INTEGER')
      .replace(/\bbigint\(\d+\)/gi, 'INTEGER')
      .replace(/\bbigint\b/gi, 'INTEGER')
      .replace(/\bdouble\b/gi, 'REAL')
      .replace(/\bfloat\b/gi, 'REAL')
      .replace(/\bvarchar\(\d+\)/gi, 'TEXT')
      .replace(/\blongtext\b/gi, 'TEXT')
      .replace(/\bmediumtext\b/gi, 'TEXT')
      .replace(/\bdatetime\b/gi, 'TEXT')
      // 删除外键约束行（含前导逗号）—— 完整匹配 FOREIGN KEY (...) REFERENCES table (...)
      .replace(/,?\s*CONSTRAINT\s+\S+\s+FOREIGN\s+KEY\s*\([^)]+\)\s*REFERENCES\s+\S+\s*\([^)]+\)/gi, '')
      // 删除 KEY / INDEX 行（sql.js 不需要，且语法有差异）
      .replace(/,?\s*(?:UNIQUE\s+)?KEY\s+`[^`]+`\s*\([^)]+\)/gi, '')
      .replace(/,?\s*INDEX\s+`[^`]+`\s*\([^)]+\)/gi, '')
      // UNIQUE KEY → 转为内联 UNIQUE（简化处理：直接删，demo 不需要强制约束）
      // 反引号 → 无引号
      .replace(/`/g, '')
      // 清理多余逗号（删了外键/KEY 行后括号前可能剩逗号）
      .replace(/,(\s*\))/g, '$1')
  );
}

