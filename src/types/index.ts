// 全局 TypeScript 类型定义
// TODO: PR1 补充完整类型

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
  txRxType: string;
  antennaName: string | null;
  matrixId: number;
  matrixCode: string;
  satelliteId: number;
}

export interface Occupation {
  id: number;
  frequencyBlockCode: string;
  switchId: number;
  switchCode: string;
  occupiedBandwidth: number;
  frequencyOffset: number;
  occupationStatus: '占用' | '空闲' | '干扰';
  occupationStartTimeMs: number | null;
  occupationEndTimeMs: number | null;
}
