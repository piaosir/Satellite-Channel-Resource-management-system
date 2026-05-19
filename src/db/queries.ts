import type { Database } from 'sql.js';
import type { Satellite, Transponder, Occupation } from '@/types';
import { saveDB } from './initDB';

// ─── 辅助：sql.js 结果 → 对象数组 ──────────────────────────
function toObjects<T>(result: ReturnType<Database['exec']>): T[] {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]])),
  ) as T[];
}

// ─── 卫星 ────────────────────────────────────────────────────
export function querySatellites(db: Database): Satellite[] {
  const res = db.exec(
    'SELECT id, satelliteCode, satelliteName FROM satellite_basic_info ORDER BY id',
  );
  return toObjects<Satellite>(res);
}

// ─── 转发器（含频率、波束） ──────────────────────────────────
export function queryTransponders(db: Database, satelliteId: number): Transponder[] {
  const sql = `
    SELECT
      sw.id                                          AS switchId,
      sw.switchCode,
      sw.switchStatus,
      sw.switchType,
      sw.twtValidStatusCode,
      SUBSTR(sw.inputChannelCodeShort, 2)            AS transponderName,
      MIN(ci_rx.channelStartFreq)                    AS rxStartFreq,
      MIN(ci_rx.channelEndFreq)                      AS rxEndFreq,
      MIN(ci_rx.channelBandwidth)                    AS channelBw,
      MIN(ci_tx.channelStartFreq)                    AS txStartFreq,
      MIN(ci_tx.channelEndFreq)                      AS txEndFreq,
      MIN(fcg.band)                                  AS band,
      MIN(fcg.polarization)                          AS polarization,
      MIN(fcg.txRxType)                              AS txRxType,
      MIN(fcg.antennaName)                           AS antennaName,
      m.id                                           AS matrixId,
      m.matrixCode,
      m.satelliteId
    FROM matrix_switch_status sw
    JOIN channel_info ci_rx  ON ci_rx.channelCodeShort  = sw.inputChannelCodeShort
    JOIN channel_info ci_tx  ON ci_tx.channelCodeShort  = sw.outputChannelCodeShort
    JOIN feed_channel_group_info fcg ON fcg.id = ci_rx.channelGroupId AND fcg.satelliteId = ${satelliteId}
    JOIN switch_matrix_info m   ON m.id = sw.matrixId
    WHERE m.satelliteId = ${satelliteId}
    GROUP BY sw.id, sw.switchCode, sw.switchStatus, sw.switchType,
             sw.twtValidStatusCode, sw.inputChannelCodeShort,
             m.id, m.matrixCode, m.satelliteId
    ORDER BY MIN(fcg.band), sw.inputPortSeq
  `;
  return toObjects<Transponder>(db.exec(sql));
}

// ─── 单个开关的占用 ──────────────────────────────────────────
export function queryOccupations(db: Database, switchId: number): Occupation[] {
  const sql = `
    SELECT id, frequencyBlockCode, switchId, switchCode,
           occupiedBandwidth, frequencyOffset, occupationStatus,
           occupationStartTimeMs, occupationEndTimeMs
    FROM occupation_realtime_status
    WHERE switchId = ${switchId}
    ORDER BY frequencyOffset
  `;
  return toObjects<Occupation>(db.exec(sql));
}

// ─── 某卫星全部占用（查询页 + 报表导出用，含全字段） ──────────
export interface OccupationFull extends Occupation {
  // occupation 扩展字段
  productInstanceCode: string | null;
  // 计算字段
  transponderName: string;
  rxActualStartFreq: number;
  rxActualEndFreq: number;
  txActualStartFreq: number;
  txActualEndFreq: number;
  // 开关
  matrixCode: string;
  inputChannelCodeShort: string;
  outputChannelCodeShort: string;
  switchStatus: number;
  switchType: string;
  twtValidStatusCode: string | null;
  // 矩阵
  satelliteCode: string;
  areaNo: number;
  groupNo: number;
  // 通道组
  band: string;
  polarization: string | null;
  txRxType: string;
  antennaName: string | null;
  channelGroupCode: string;
  // 上行通道
  channelStartFreq: number;
  channelEndFreq: number;
  channelBandwidth: number;
  // 下行通道
  txChannelStartFreq: number;
  txChannelEndFreq: number;
  txChannelBandwidth: number;
}

export function queryAllOccupations(
  db: Database,
  satelliteId: number,
  statusFilter?: string,
): OccupationFull[] {
  const statusClause = statusFilter ? `AND occ.occupationStatus = '${statusFilter.replace(/'/g, "''")}'` : '';
  const sql = `
    SELECT
      occ.id,
      occ.frequencyBlockCode,
      occ.productInstanceCode,
      occ.switchId,
      occ.switchCode,
      occ.occupiedBandwidth,
      occ.frequencyOffset,
      occ.occupationStatus,
      occ.occupationStartTimeMs,
      occ.occupationEndTimeMs,
      SUBSTR(sw.inputChannelCodeShort, 2)                                      AS transponderName,
      sw.matrixCode,
      sw.inputChannelCodeShort,
      sw.outputChannelCodeShort,
      sw.switchStatus,
      sw.switchType,
      sw.twtValidStatusCode,
      m.satelliteCode,
      m.areaNo,
      m.groupNo,
      fcg.band,
      fcg.polarization,
      fcg.txRxType,
      fcg.antennaName,
      fcg.channelGroupCode,
      ci_rx.channelStartFreq,
      ci_rx.channelEndFreq                                                     AS channelEndFreq,
      ci_rx.channelBandwidth                                                   AS channelBandwidth,
      ci_tx.channelStartFreq                                                   AS txChannelStartFreq,
      ci_tx.channelEndFreq                                                     AS txChannelEndFreq,
      ci_tx.channelBandwidth                                                   AS txChannelBandwidth,
      (ci_rx.channelStartFreq + occ.frequencyOffset)                           AS rxActualStartFreq,
      (ci_rx.channelStartFreq + occ.frequencyOffset + occ.occupiedBandwidth)   AS rxActualEndFreq,
      (ci_tx.channelStartFreq + occ.frequencyOffset)                           AS txActualStartFreq,
      (ci_tx.channelStartFreq + occ.frequencyOffset + occ.occupiedBandwidth)   AS txActualEndFreq
    FROM occupation_realtime_status occ
    JOIN matrix_switch_status sw     ON sw.id  = occ.switchId
    JOIN switch_matrix_info m        ON m.id   = sw.matrixId
    JOIN channel_info ci_rx          ON ci_rx.channelCodeShort = sw.inputChannelCodeShort
    JOIN channel_info ci_tx          ON ci_tx.channelCodeShort = sw.outputChannelCodeShort
    JOIN feed_channel_group_info fcg ON fcg.id = ci_rx.channelGroupId AND fcg.satelliteId = ${satelliteId}
    WHERE m.satelliteId = ${satelliteId}
    ${statusClause}
    ORDER BY fcg.band, sw.inputPortSeq, occ.frequencyOffset
  `;
  return toObjects<OccupationFull>(db.exec(sql));
}

// ─── 写操作（参数化风格，防 SQL 注入） ───────────────────────
export function insertOccupation(
  db: Database,
  data: {
    frequencyBlockCode: string;
    switchId: number;
    switchCode: string;
    occupiedBandwidth: number;
    frequencyOffset: number;
    occupationStatus: string;
    occupationStartTimeMs?: number | null;
    occupationEndTimeMs?: number | null;
  },
): void {
  db.run(
    `INSERT INTO occupation_realtime_status
      (frequencyBlockCode, productInstanceId, productInstanceCode,
       switchId, switchCode, occupiedBandwidth, frequencyOffset,
       occupationStatus, occupationStartTimeMs, occupationEndTimeMs)
     VALUES (?,NULL,NULL,?,?,?,?,?,?,?)`,
    [
      data.frequencyBlockCode,
      data.switchId,
      data.switchCode,
      data.occupiedBandwidth,
      data.frequencyOffset,
      data.occupationStatus,
      data.occupationStartTimeMs ?? null,
      data.occupationEndTimeMs ?? null,
    ],
  );
  saveDB(db);
}

export function updateOccupation(
  db: Database,
  id: number,
  data: {
    occupiedBandwidth?: number;
    frequencyOffset?: number;
    occupationStatus?: string;
    occupationStartTimeMs?: number | null;
    occupationEndTimeMs?: number | null;
  },
): void {
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (data.occupiedBandwidth !== undefined) { sets.push('occupiedBandwidth=?'); vals.push(data.occupiedBandwidth); }
  if (data.frequencyOffset   !== undefined) { sets.push('frequencyOffset=?');   vals.push(data.frequencyOffset); }
  if (data.occupationStatus  !== undefined) { sets.push('occupationStatus=?');  vals.push(data.occupationStatus); }
  if (data.occupationStartTimeMs !== undefined) { sets.push('occupationStartTimeMs=?'); vals.push(data.occupationStartTimeMs ?? null); }
  if (data.occupationEndTimeMs !== undefined) { sets.push('occupationEndTimeMs=?'); vals.push(data.occupationEndTimeMs ?? null); }
  if (sets.length === 0) return;
  vals.push(id);
  db.run(`UPDATE occupation_realtime_status SET ${sets.join(',')} WHERE id=?`, vals);
  saveDB(db);
}

export function deleteOccupation(db: Database, id: number): void {
  db.run('DELETE FROM occupation_realtime_status WHERE id=?', [id]);
  saveDB(db);
}

export function queryOccupationsForConflict(
  db: Database,
  switchId: number,
  excludeId?: number,
): Pick<Occupation, 'frequencyOffset' | 'occupiedBandwidth'>[] {
  const exclude = excludeId ? `AND id != ${excludeId}` : '';
  return toObjects(
    db.exec(`SELECT frequencyOffset, occupiedBandwidth FROM occupation_realtime_status WHERE switchId=${switchId} ${exclude}`),
  ) as Pick<Occupation, 'frequencyOffset' | 'occupiedBandwidth'>[];
}

