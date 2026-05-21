import type { FrequencyBlock } from '@/types';

/**
 * 格式化频率数值：最多保留 3 位小数，去除尾零
 * 避免浮点精度问题导致显示如 14498.000000001
 */
export function fmtFreq(v: number): string {
  return parseFloat(v.toFixed(3)).toString();
}

/** 极化常用名：H→水平, V→垂直, L→左旋, R→右旋, Z→圆极化 */
export function fmtPolarization(v: string | null | undefined): string {
  if (!v) return '—';
  const map: Record<string, string> = {
    H: 'H 水平', V: 'V 垂直', L: 'L 左旋', R: 'R 右旋', Z: 'Z 圆极化',
  };
  return map[v] ?? v;
}

/** 收发类型常用名：R→接收（上行）, T→发射（下行） */
export function fmtTxRxType(v: string | null | undefined): string {
  if (!v) return '—';
  return v === 'R' ? '接收（上行）' : v === 'T' ? '发射（下行）' : v;
}

/** 划分状态常用名：P→划分（在用）, R→空闲 */
export function fmtPartitionStatus(v: string | null | undefined): string {
  if (!v) return '—';
  return v === 'P' ? '划分（在用）' : v === 'R' ? '空闲' : v;
}

/** 开关状态常用名：1→开, 0→关 */
export function fmtSwitchStatus(v: number | null | undefined): string {
  if (v == null) return '—';
  return v === 1 ? '开' : '关';
}

/** 通道显示名（含波束铰链 / 前返向括注）
 *  - 矩阵备注含"前向"/"返向" → `C1A（大理前向）`
 *  - 否则拼接入/出波束名  → `C1A（国土-国土）`
 *  - 均无有效信息则原样返回
 */
export function fmtChannelLabel(t: {
  transponderName: string;
  matrixRemark?: string | null;
  antennaName?: string | null;
  txAntennaName?: string | null;
}): string {
  const name = t.transponderName;
  if (t.matrixRemark && (t.matrixRemark.includes('前向') || t.matrixRemark.includes('返向'))) {
    return `${name}（${t.matrixRemark}）`;
  }
  const rx = (t.antennaName ?? '').replace('波束', '').trim();
  const tx = (t.txAntennaName ?? '').replace('波束', '').trim();
  if (rx || tx) {
    const beamPart = rx === tx ? rx : `${rx}-${tx}`;
    return beamPart ? `${name}（${beamPart}）` : name;
  }
  return name;
}

export function calcOccFreq(
  occ: FrequencyBlock,
  rxChannelStart: number,
  txChannelStart: number,
  channelBw: number,
) {
  return {
    rxStart:    rxChannelStart + occ.frequencyOffset,
    rxEnd:      rxChannelStart + occ.frequencyOffset + occ.occupiedBandwidth,
    txStart:    txChannelStart + occ.frequencyOffset,
    txEnd:      txChannelStart + occ.frequencyOffset + occ.occupiedBandwidth,
    posRatio:   occ.frequencyOffset / channelBw,
    widthRatio: occ.occupiedBandwidth / channelBw,
  };
}

export function freqToOffset(
  inputFreqStart: number,
  channelStart: number,
  inputFreqEnd: number,
) {
  return {
    frequencyOffset:   inputFreqStart - channelStart,
    occupiedBandwidth: inputFreqEnd - inputFreqStart,
  };
}

export function validateOccupation(
  offset: number,
  bw: number,
  channelBw: number,
): string | null {
  if (offset < 0) return '偏移量不能为负';
  if (bw <= 0)    return '占用宽度必须大于 0';
  if (offset + bw > channelBw) return `超出通道带宽范围（${channelBw} MHz）`;
  return null;
}

export function hasConflict(
  newOffset: number,
  newBw: number,
  existing: { frequencyOffset: number; occupiedBandwidth: number }[],
): boolean {
  return existing.some(
    (e) =>
      !(
        newOffset + newBw <= e.frequencyOffset ||
        newOffset >= e.frequencyOffset + e.occupiedBandwidth
      ),
  );
}

