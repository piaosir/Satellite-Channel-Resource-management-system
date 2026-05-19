import type { Occupation } from '@/types';

/**
 * 格式化频率数值：最多保留 3 位小数，去除尾零
 * 避免浮点精度问题导致显示如 14498.000000001
 */
export function fmtFreq(v: number): string {
  return parseFloat(v.toFixed(3)).toString();
}

export function calcOccFreq(
  occ: Occupation,
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

