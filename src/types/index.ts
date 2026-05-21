// 全局 TypeScript 类型定义

export interface Satellite {
  id: number;
  satelliteCode: string;
  satelliteName: string;
}

export interface Transponder {
  switchId: number;
  switchCode: string;
  switchStatus: number;
  switchType: string;
  twtValidStatusCode: string | null;
  transponderName: string;
  rxStartFreq: number;
  rxEndFreq: number;
  channelBw: number;
  txStartFreq: number;
  txEndFreq: number;
  band: string;
  polarization: string | null;
  antennaName: string | null;   // 映射自 channel_group_info.beamCode
  txBand: string | null;
  txPolarization: string | null;
  txAntennaName: string | null;
  txRxType: string;
  matrixId: number;
  matrixCode: string;
  matrixRemark: string | null;
  satelliteId: number;
  inputChannelShortName: string;
  outputChannelShortName: string;
  inputChannelId: number;
}

/** 频率块 — 对应 frequency_block_realtime_status 表 */
export interface FrequencyBlock {
  id: number;
  frequencyBlockCode: string | null;
  frequencyBlockCode2: string | null;
  switchId: number;
  switchCode: string | null;
  frequencyOffset: number;
  occupiedBandwidth: number;
  /** P = 划分（在用）  R = 回收（空闲） */
  partitionStatus: 'P' | 'R';
  statusUpdateTime: number | null;
  /** 出租 / 合作 / 自用 / 禁用 */
  usageType: string | null;
  uplinkStartFreq: number | null;
  uplinkEndFreq: number | null;
  downlinkStartFreq: number | null;
  downlinkEndFreq: number | null;
}

/** 频率块（含转发器/通道/矩阵完整关联字段，供报表/管理页） */
export interface FrequencyBlockFull extends FrequencyBlock {
  switchStatus: number;
  switchType: string;
  twtValidStatusCode: string | null;
  inputChannelShortName: string;
  outputChannelShortName: string;
  transponderName: string;
  inputChannelId: number;
  satelliteCode: string;
  areaNo: number;
  groupNo: number;
  matrixCode: string;
  matrixRemark: string | null;
  band: string;
  polarization: string | null;
  txRxType: string;
  antennaName: string | null;
  txBand: string | null;
  txPolarization: string | null;
  txAntennaName: string | null;
  channelStartFreq: number;
  channelEndFreq: number;
  channelBandwidth: number;
  txChannelStartFreq: number;
  txChannelEndFreq: number;
  txChannelBandwidth: number;
}

/** 向后兼容：Occupation 已重命名为 FrequencyBlock */
export type Occupation = FrequencyBlock;
