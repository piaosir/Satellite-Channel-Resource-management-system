"""
数据库迁移工具
==============

每次需要变更数据库结构或基础数据时，在 migrations/ 目录下新增一个文件：

    migrations/002_add_remark_column.sql
    migrations/003_create_new_table.sql
    ...

命名规则：<三位序号>_<描述>.sql，序号决定执行顺序。

注意事项：
  - 每条 SQL 语句必须以分号 (;) 结尾
  - 建议使用 IF NOT EXISTS / IF EXISTS，保证语句可重试
  - 不支持含分号的存储过程/触发器，如需要请拆为独立脚本手动执行
  - MySQL DDL 会隐式提交事务，若文件中途失败需手动修复后重新运行

用法：
    python migrate.py              # 应用所有待执行的迁移
    python migrate.py --status     # 查看当前迁移状态
"""

import glob
import logging
import os
import re
import sys

import pymysql
import pymysql.cursors
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrations")

_CREATE_TRACKING_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
"""


def _ensure_database() -> None:
    """目标库不存在时自动创建(全新部署 / v6 重建场景)。"""
    conn = pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        charset="utf8mb4",
        autocommit=True,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{os.getenv('DB_NAME', 'v6')}` "
                "DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
            )
    finally:
        conn.close()


def _get_conn() -> pymysql.Connection:
    _ensure_database()
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "v6"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def _migration_files() -> list[tuple[str, str]]:
    """返回 [(版本名, 文件路径), ...] 按文件名排序。"""
    files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    return [(os.path.basename(f).removesuffix(".sql"), f) for f in files]


def _applied_versions(conn: pymysql.Connection) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT version FROM schema_migrations")
        return {row["version"] for row in cur.fetchall()}


def _split_statements(sql_text: str) -> list[str]:
    """按分号切分 SQL,但忽略单引号字符串字面量内部的分号。
    (种子数据的文本字段可能含分号,朴素 split 会切坏语句)"""
    stmts, buf, in_str = [], [], False
    i, n = 0, len(sql_text)
    while i < n:
        ch = sql_text[i]
        if in_str:
            buf.append(ch)
            if ch == "\\" and i + 1 < n:        # 反斜杠转义,连同下一字符
                buf.append(sql_text[i + 1])
                i += 2
                continue
            if ch == "'":
                if i + 1 < n and sql_text[i + 1] == "'":  # '' 转义
                    buf.append("'")
                    i += 2
                    continue
                in_str = False
        elif ch == "'":
            in_str = True
            buf.append(ch)
        elif ch == ";":
            stmts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
        i += 1
    if buf:
        stmts.append("".join(buf))
    # 过滤空语句和纯注释块
    out = []
    for raw in stmts:
        cleaned = re.sub(r"--[^\n]*", "", raw).strip()
        if cleaned:
            out.append(raw.strip())
    return out


def _apply(conn: pymysql.Connection, version: str, filepath: str) -> None:
    with open(filepath, encoding="utf-8") as f:
        sql_text = f.read()

    stmts = _split_statements(sql_text)

    with conn.cursor() as cur:
        for stmt in stmts:
            cur.execute(stmt)
        # 记录此迁移已应用（与最后一条 DML 在同一事务中提交）
        cur.execute(
            "INSERT INTO schema_migrations (version) VALUES (%s)", (version,)
        )
    conn.commit()
    log.info("已应用：%s", version)


def run_migrations(verbose: bool = True) -> None:
    """应用所有尚未执行的迁移文件，供启动时自动调用或手动执行。"""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(_CREATE_TRACKING_TABLE)
        conn.commit()

        applied = _applied_versions(conn)
        pending = [(ver, path) for ver, path in _migration_files() if ver not in applied]

        if not pending:
            if verbose:
                log.info("所有迁移均已应用，数据库已是最新版本")
            return

        log.info("发现 %d 个待应用的迁移：", len(pending))
        for version, path in pending:
            _apply(conn, version, path)
        if verbose:
            log.info("迁移完成！")
    finally:
        conn.close()


def show_status() -> None:
    """打印每个迁移文件的应用状态。"""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(_CREATE_TRACKING_TABLE)
        conn.commit()

        applied = _applied_versions(conn)
        files = _migration_files()

        if not files:
            print("migrations/ 目录为空，暂无迁移文件")
            return

        col_w = max(len(v) for v, _ in files) + 2
        print(f"\n{'版本':<{col_w}}{'状态'}")
        print("-" * (col_w + 10))
        for version, _ in files:
            status = "✓ 已应用" if version in applied else "○ 待应用"
            print(f"{version:<{col_w}}{status}")
        print()
    finally:
        conn.close()


if __name__ == "__main__":
    if "--status" in sys.argv:
        show_status()
    else:
        run_migrations()
