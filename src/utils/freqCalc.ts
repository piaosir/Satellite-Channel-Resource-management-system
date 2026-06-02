import type { FrequencyBlock } from '@/types';

/**
 * 格式化频率数值：最多保留 3 位小数，去除尾零
 * 避免浮点精度问题导致显示如 14498.000000001
 */
export function fmtFreq(v: number | null | undefined): string {
  if (v == null) return '—';
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

/** 通道显示名：入端口代码-出端口代码（如 `RC1A-TC1A`）
 *  - 入/出端口短代码齐全 → `RC1A-TC1A`
 *  - 仅有其一            → 取其一
 *  - 均缺失              → 回退到常用名 transponderName
 */
export function fmtChannelLabel(t: {
  transponderName: string;
  inputChannelShortName?: string | null;
  outputChannelShortName?: string | null;
}): string {
  const inp = t.inputChannelShortName?.trim();
  const out = t.outputChannelShortName?.trim();
  if (inp && out) return `${inp}-${out}`;
  return inp || out || t.transponderName;
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

