/**
 * 频率车道构建工具
 * ------------------
 * 把"通道 / 规划块 / 分配块"按 (上行极化 + 上行波束) 分组成车道,
 * 用转发器频率计划的逻辑表征(界面上称"通道基准"),不出现转发器字样。
 */
import type { Channel, PlanningBlock, AllocationBlock, UsageType } from '@/types';

export const USAGE_COLORS: Record<UsageType, string> = {
  出租: '#3b82f6',
  自用: '#22c55e',
  合作: '#a855f7',
  禁用: '#64748b',
};

/** 分配块占用着色:合约占用 / 自有占用 / 空闲 */
export function allocColor(b: AllocationBlock): { fill: string; outline: boolean } {
  if ((b.contractBalance ?? 0) > 0) return { fill: '#f59e0b', outline: false };
  if ((b.carrierBalance ?? 0) > 0) return { fill: '#06b6d4', outline: false };
  return { fill: '#475569', outline: true };
}

export function allocStatusText(b: AllocationBlock): string {
  if ((b.contractBalance ?? 0) > 0) return `合约占用中${b.occupantNames ? `:${b.occupantNames}` : ''}`;
  if ((b.carrierBalance ?? 0) > 0) return '自用占用中';
  return '空闲(已分配未占用)';
}

export interface Lane {
  key: string;
  polarization: string;
  beam: string;
  beamName: string | null;
  band: string | null;
  freqMin: number;
  freqMax: number;
  channels: Channel[];
  planningBlocks: PlanningBlock[];
  allocationBlocks: AllocationBlock[];
}

/**
 * 构建车道:以接收(R)通道组的 极化+波束代号 为车道键;
 * 规划/分配块按解析出的 上行极化+上行波束 归入。
 */
export function buildLanes(
  channels: Channel[],
  planningBlocks: PlanningBlock[],
  allocationBlocks: AllocationBlock[] = [],
): Lane[] {
  const lanes = new Map<string, Lane>();

  const ensure = (pol: string, beam: string, beamName: string | null, band: string | null): Lane => {
    const key = `${pol}|${beam}`;
    let lane = lanes.get(key);
    if (!lane) {
      lane = {
        key, polarization: pol, beam, beamName, band,
        freqMin: Infinity, freqMax: -Infinity,
        channels: [], planningBlocks: [], allocationBlocks: [],
      };
      lanes.set(key, lane);
    }
    if (!lane.beamName && beamName) lane.beamName = beamName;
    if (!lane.band && band) lane.band = band;
    return lane;
  };

  const widen = (lane: Lane, s: number | null | undefined, e: number | null | undefined) => {
    if (s != null && s < lane.freqMin) lane.freqMin = s;
    if (e != null && e > lane.freqMax) lane.freqMax = e;
  };

  for (const c of channels) {
    if (c.txRxType !== 'R' || !c.polarization || !c.antennaCode) continue;
    const lane = ensure(c.polarization, c.antennaCode, c.antennaName ?? null, c.band ?? null);
    lane.channels.push(c);
    widen(lane, c.channelStartFreq, c.channelEndFreq);
  }
  for (const p of planningBlocks) {
    if (!p.uplinkPolarization || !p.uplinkBeam) continue;
    const lane = ensure(p.uplinkPolarization, p.uplinkBeam, null, null);
    lane.planningBlocks.push(p);
    widen(lane, p.uplinkStartFreq, p.uplinkEndFreq);
  }
  for (const a of allocationBlocks) {
    if (!a.uplinkPolarization || !a.uplinkBeam) continue;
    const lane = ensure(a.uplinkPolarization, a.uplinkBeam, null, null);
    lane.allocationBlocks.push(a);
    widen(lane, a.uplinkStartFreq, a.uplinkEndFreq);
  }

  return [...lanes.values()]
    .filter((l) => Number.isFinite(l.freqMin) && Number.isFinite(l.freqMax))
    .sort((a, b) => a.beam.localeCompare(b.beam) || a.polarization.localeCompare(b.polarization));
}

export interface Gap { us: number; ue: number }

/** 计算频率范围内的空闲间隙(扣除已占区间,按上行频率) */
export function computeGaps(extS: number, extE: number, blocks: { us: number; ue: number }[]): Gap[] {
  const sorted = blocks
    .map((b) => ({ us: Math.max(b.us, extS), ue: Math.min(b.ue, extE) }))
    .filter((b) => b.ue > b.us)
    .sort((a, b) => a.us - b.us);
  const merged: Gap[] = [];
  for (const b of sorted) {
    const last = merged[merged.length - 1];
    if (last && b.us <= last.ue + 1e-9) last.ue = Math.max(last.ue, b.ue);
    else merged.push({ ...b });
  }
  const gaps: Gap[] = [];
  let cursor = extS;
  for (const m of merged) {
    if (m.us - cursor > 0.009) gaps.push({ us: cursor, ue: m.us });
    cursor = Math.max(cursor, m.ue);
  }
  if (extE - cursor > 0.009) gaps.push({ us: cursor, ue: extE });
  return gaps;
}

/** 从通道(含通道组 join 字段)提取 波束代号 → 中文波束名 映射 */
export function beamNameMap(channels: Channel[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const c of channels) {
    if (c.antennaCode && c.antennaName && !m[c.antennaCode]) m[c.antennaCode] = c.antennaName;
  }
  return m;
}

/** 波束显示:有中文名时 “中文名[代号]”,否则只显示代号 */
export const beamLabel = (names: Record<string, string>, code: string | null | undefined): string =>
  !code ? '—' : (names[code] ? `${names[code]}[${code}]` : code);

export const fmtFreq = (v: number | null | undefined): string =>
  v == null ? '—' : `${Number(v).toFixed(v % 1 === 0 ? 0 : 2)}`;

export const fmtRange = (s: number | null | undefined, e: number | null | undefined): string =>
  `${fmtFreq(s)} ~ ${fmtFreq(e)} MHz`;
