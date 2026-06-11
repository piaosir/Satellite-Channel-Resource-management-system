/**
 * 通道资源管理系统 — 类型定义(对应后端 v2.0 API / v6 数据模型)
 * 三层模型:资源层(卫星→通道组→通道→矩阵/开关) / 状态层(规划/分配) / 业务层(客户→合约→交付)
 */

// ── 资源层 ────────────────────────────────────────────────────
export interface Satellite {
  id: number;
  satelliteCode: string;
  satelliteCodeNonStd: string | null;
  satelliteName: string | null;
  statusText: string | null;          // 在轨运营/在轨停服/离轨
  orbitPosition: string | null;
  launchDate: string | null;
  designLife: string | null;
  manufacturer: string | null;
  platform: string | null;
  coverage: string | null;
  payload: string | null;
  channelGroupCount?: number;
  matrixCount?: number;
}

export interface Beacon {
  id: number;
  satelliteCode: string | null;
  satelliteId: number | null;
  band: string | null;
  polarization: string | null;
  frequency: number | null;
}

export interface ChannelGroup {
  id: number;
  channelGroupCode: string;
  groupSeq: string | null;
  satelliteCode: string | null;
  satelliteId: number | null;
  antennaName: string | null;         // 波束(天线)名称
  antennaCode: string | null;         // 波束(天线)代号
  txRxType: 'R' | 'T' | null;
  polarization: string | null;
  band: string | null;
  channelCount: number | null;
  primaryReceiverCode: string | null;
  backupReceiverCode1: string | null;
  backupReceiverCode2: string | null;
  receiverActiveStatus: string | null;
}

export interface Channel {
  id: number;
  channelCode: string;
  channelFullName: string | null;
  channelShortName: string | null;
  commonName: string | null;
  channelGroupCode: string | null;
  channelGroupId: number | null;
  channelBandwidth: number | null;
  channelStartFreq: number | null;
  channelEndFreq: number | null;
  // join 自通道组
  satelliteCode?: string | null;
  antennaName?: string | null;
  antennaCode?: string | null;
  txRxType?: 'R' | 'T' | null;
  polarization?: string | null;
  band?: string | null;
}

export interface Matrix {
  id: number;
  matrixCode: string;
  satelliteCode: string | null;
  satelliteId: number | null;
  matrixType: 1 | 2 | null;           // 1常规 2 DTP
  matrixSeq: number | null;
  inputPortCount: number | null;
  outputPortCount: number | null;
  effectiveStatus: 0 | 1 | null;
  remark: string | null;
  updateTime: string | null;
}

export interface MatrixPort {
  id: number;
  portCode: string | null;
  matrixCode: string | null;
  matrixId: number | null;
  ioType: 'I' | 'O' | null;
  portSeq: number | null;
  channelShortName: string | null;
  channelId: number | null;
  channelCode?: string | null;
  channelFullName?: string | null;
  commonName?: string | null;
  channelStartFreq?: number | null;
  channelEndFreq?: number | null;
  channelBandwidth?: number | null;
}

/** 矩阵开关全量视图(交叉点 + 入/出通道 + 通道组 + 放大器主备) */
export interface MatrixSwitch {
  id: number;
  switchCode: string;
  matrixId: number | null;
  matrixCode: string | null;
  inputPortSeq: number | null;
  outputPortSeq: number | null;
  switchType: '常通' | '可切' | null;
  switchStatus: 0 | 1 | null;
  primaryAmpCode: string | null;
  backupAmpCode1: string | null;
  backupAmpCode2: string | null;
  ampActiveStatus: string | null;     // P0/P1/P2
  updateTime: string | null;
  matrixType: 1 | 2 | null;
  matrixSeq: number | null;
  matrixRemark: string | null;
  satelliteId: number | null;
  satelliteCode: string | null;
  inputChannelShortName: string | null;
  outputChannelShortName: string | null;
  inputChannelId: number | null;
  inputChannelCode: string | null;
  inputCommonName: string | null;
  rxStartFreq: number | null;
  rxEndFreq: number | null;
  channelBandwidth: number | null;
  outputChannelId: number | null;
  outputChannelCode: string | null;
  txStartFreq: number | null;
  txEndFreq: number | null;
  rxBand: string | null;
  rxPolarization: string | null;
  rxAntennaName: string | null;
  rxAntennaCode: string | null;
  txBand: string | null;
  txPolarization: string | null;
  txAntennaName: string | null;
  txAntennaCode: string | null;
}

export interface SwitchLog {
  id: number;
  switchCode: string | null;
  switchId: number | null;
  beforeStatus: string | null;
  afterStatus: string | null;
  switchTime: string | null;
  operator: string | null;
  registrar: string | null;
}

export interface ReceiverLog {
  id: number;
  channelGroupCode: string | null;
  channelGroupId: number | null;
  beforeStatus: string | null;
  afterStatus: string | null;
  switchTime: string | null;
  operator: string | null;
  registrar: string | null;
}

// ── 状态层 ────────────────────────────────────────────────────
export type UsageType = '自用' | '出租' | '合作' | '禁用';

/** 通道规划状态:基底,块 + 用途 */
export interface PlanningBlock {
  id: number;
  blockCode: string;
  usageType: UsageType | null;
  isValid: 0 | 1 | null;
  updateTime: string | null;
  satelliteCode: string | null;
  satelliteId: number | null;
  bandwidth: number | null;
  uplinkPolarization: string | null;
  uplinkBeam: string | null;
  uplinkStartFreq: number | null;
  uplinkEndFreq: number | null;
  downlinkPolarization: string | null;
  downlinkBeam: string | null;
  downlinkStartFreq: number | null;
  downlinkEndFreq: number | null;
  channelId: number | null;
  channelCode?: string | null;
  channelShortName?: string | null;
  commonName?: string | null;
  channelStartFreq?: number | null;
  channelEndFreq?: number | null;
  channelBandwidth?: number | null;
}

/** 通道分配状态:基于规划的实际占用快照。
 *  isValid 与占用/释放互相独立:仅块被拆分或冲突时置 0。 */
export interface AllocationBlock {
  id: number;
  blockCode: string;
  isValid: 0 | 1 | null;
  updateTime: string | null;
  satelliteCode: string | null;
  satelliteId: number | null;
  bandwidth: number | null;
  uplinkPolarization: string | null;
  uplinkBeam: string | null;
  uplinkStartFreq: number | null;
  uplinkEndFreq: number | null;
  downlinkPolarization: string | null;
  downlinkBeam: string | null;
  downlinkStartFreq: number | null;
  downlinkEndFreq: number | null;
  planningBlockId: number | null;
  channelId: number | null;
  planningBlockCode?: string | null;
  planningUsageType?: UsageType | null;
  channelCode?: string | null;
  channelShortName?: string | null;
  commonName?: string | null;
  channelStartFreq?: number | null;
  channelEndFreq?: number | null;
  /** 合约占用余额(占用-释放,>0 表示有合约在用) */
  contractBalance?: number;
  /** 自有载波占用余额 */
  carrierBalance?: number;
  /** 当前占用方客户名(、分隔) */
  occupantNames?: string | null;
}

// ── 业务层 ────────────────────────────────────────────────────
export interface Customer {
  customerCode: string;
  customerName: string | null;
  creditCode: string | null;
  status: number | null;
  createdTime: string | null;
  updateTime: string | null;
  users?: UserInfo[];
}

export interface UserInfo {
  id: number;
  customerCode: string | null;
  customerName: string | null;
  status: number | null;
  createdTime: string | null;
  updateTime: string | null;
}

export interface Contract {
  id: number;
  customerName: string | null;
  customerCode: string | null;
  userId: number | null;
  mainOrderCode: string | null;
  productName: string | null;
  productType: string | null;
  bandwidthMHz: number | null;
  divisibleBlockCount: number | null;
  periods: number | null;
  amount: number | null;
  startTime: string | null;
  endTime: string | null;
  updateTime: string | null;
  deliveryRecordCount?: number;
  occupiedBandwidth?: number;
  deliveryRecords?: DeliveryRecord[];
}

/** 合约-交付过程记录:频率块代码必须引用通道分配状态 */
export interface DeliveryRecord {
  id: number;
  contractId: number | null;
  blockCode: string | null;
  allocationId: number | null;
  exclusiveType: string | null;       // 独占/共享
  satelliteCode: string | null;
  satelliteId: number | null;
  bandwidth: number | null;
  action: '占用' | '释放' | null;
  actionTime: string | null;
  handler: string | null;
  registrar: string | null;
  allocationIsValid?: 0 | 1 | null;
  customerName?: string | null;
  productName?: string | null;
}

export interface BusinessSystem {
  id: number;
  systemCode: string | null;
  basebandName: string | null;
  createdTime: string | null;
  updateTime: string | null;
}

export interface Carrier {
  id: number;
  businessSystemId: number | null;
  direction: string | null;           // 前向/返向
  bandwidth: number | null;
}

export interface CarrierUsageRecord {
  id: number;
  carrierId: number | null;
  blockCode: string | null;
  allocationId: number | null;
  exclusiveType: string | null;
  satelliteCode: string | null;
  satelliteId: number | null;
  bandwidth: number | null;
  action: '占用' | '释放' | null;
  actionTime: string | null;
  handler: string | null;
  registrar: string | null;
  allocationIsValid?: 0 | 1 | null;
}

// ── 统计 ──────────────────────────────────────────────────────
export interface SatelliteStats {
  byBand: {
    band: string;
    designBw: number;      // 设计带宽(全部接收通道)
    maxBw: number;         // 最大带宽(开关置1的通道)
    plannedBw: number;     // 已规划(有效规划块)
    allocatedBw: number;   // 已分配(有效分配块)
    occupiedBw: number;    // 已用(实际占用,非空闲)
  }[];
  byUsageType: { usageType: string; bw: number; blockCount: number }[];
  allocation: { totalBlocks: number; validBlocks: number; validBw: number };
  usage: {
    maxBw: number;
    occupiedBw: number;
    occupiedBlocks: number;
    idleAllocatedBw: number;
    utilization: number;   // 已用/最大,百分比
  };
  summary: {
    totalDesignBw: number;
    totalMaxBw: number;
    totalPlannedBw: number;
    totalOccupiedBw: number;
  };
}
