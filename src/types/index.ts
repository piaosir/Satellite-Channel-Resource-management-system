// 全局 TypeScript 类型定义

export interface Satellite {
  id: number;
  satelliteCode: string;
  satelliteName: string;
  // ── 卫星档案扩展字段（来自 satellite_info 002 迁移，均可空以兼容旧响应）──
  orbitPosition?: string | null;
  statusText?: string | null;            // 在轨运营 / 停止服务 / 离轨 / 在建
  coverage?: string | null;
  transponderCount?: string | null;
  beacon?: string | null;
  polarization?: string | null;
  launchDate?: string | null;
  designLife?: string | null;
  ownership?: string | null;             // 自有 / 代理
  manufacturer?: string | null;
  platform?: string | null;
  attitudeStabilization?: string | null;
  stationKeepingAccuracy?: string | null;
  remark?: string | null;
}

/** 行波管 TWT — 对应 twt_realtime_status 表 */
export interface Twt {
  id: number;
  twtCodeLong: string | null;
  twtCodeShort: string | null;
  satelliteCode: string | null;
  satelliteId: number | null;
  unitCode: string | null;
  onOff: string | null;
  mutingStatus: string | null;
  gainMode: string | null;               // FGM / ALC
  gainLevel: number | null;
  statusUpdateTime: number | null;
}

/** 通道属性（增益 / SFD）— 对应 channel_attribute_info 表 */
export interface ChannelAttribute {
  id: number;
  switchCode: string | null;
  matrixCode: string | null;
  inputPortSeq: number | null;
  outputPortSeq: number | null;
  inputChannelShortName: string | null;
  outputChannelShortName: string | null;
  gainMode: string | null;
  currentLevel: number | null;
  startLevel: number | null;
  maxLevel: number | null;
  levelStep: string | null;
  startSfdRef: string | null;
  currentSfd: string | null;
  satelliteId: number | null;
  switchId: number | null;
}

/** 开关组 — 对应 switch_group_info 表 */
export interface SwitchGroup {
  id: number;
  switchGroupCode: string | null;
  switchCode: string | null;
  matrixCode: string | null;
  inputPortSeq: number | null;
  outputPortSeq: number | null;
  inputChannelShortName: string | null;
  outputChannelShortName: string | null;
  switchStatus: number | null;           // 1 通 / 0 断
  switchType: string | null;             // 常通 / 可切
  checkRule: string | null;
  satelliteId: number | null;
}

/** 商品实例 — 对应 product_instance 表 */
export interface ProductInstance {
  id: number;
  productInstanceCode: string | null;
  subOrderCode: string | null;
  productName: string | null;
  instanceType: string | null;
  unitPrice: number | null;
  contractPeriod: string | null;
  planStartTime: string | null;
  planEndTime: string | null;
  fulfillStatus: string | null;
  subOrderCategory: string | null;
  mainOrderCode: string | null;
  contractNo: string | null;
  partyA: string | null;
  groupName: string | null;
  sales: string | null;
  reporter: string | null;
  subOrderAmount: number | null;
  mainOrderAmount: number | null;
  bandwidthMHz: number | null;
  satelliteCode: string | null;
  frequencyBlockCode2: string | null;
  exclusiveType: string | null;
  remark: string | null;
}

/** 合约记录（新）— 对应 contract_record 表 */
export interface ContractRecord {
  id: number;
  remarkInfo: string | null;
  productInstanceId: string | null;
  subOrderCode: string | null;
  partyA: string | null;
  productName: string | null;
  contractNo: string | null;
  remark: string | null;
  frequencyBlockCode2: string | null;
  exclusiveType: string | null;
  usedBandwidth: number | null;
  startTime: string | null;
  endTime: string | null;
  satelliteCode: string | null;
  uplinkBeamCode: string | null;
  uplinkPolarization: string | null;
  uplinkStartFreq: number | null;
  uplinkEndFreq: number | null;
  downlinkBeamCode: string | null;
  downlinkPolarization: string | null;
  downlinkStartFreq: number | null;
  downlinkEndFreq: number | null;
  satelliteId: number | null;
  frequencyBlockId: number | null;
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
