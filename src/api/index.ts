import type {
  Satellite, Transponder, FrequencyBlock, FrequencyBlockFull,
  Twt, ChannelAttribute, SwitchGroup, ProductInstance, ContractRecord,
} from '@/types';

export interface BandStat {
  band: string;
  designBw: number;
  usedBw: number;
  recoveredBw: number;
}

export interface BandwidthStats {
  byBand: BandStat[];
  byUsageType: { usageType: string; bw: number }[];
  summary: {
    totalDesignBw: number;
    usedBw: number;
    recoveredBw: number;
    totalOccupiedBw: number;
  };
}

const BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `API 错误 ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── 卫星 ──────────────────────────────────────────────────────
export const fetchSatellites = (): Promise<Satellite[]> =>
  apiFetch('/satellites');

export const fetchSatelliteDetail = (id: number): Promise<Satellite> =>
  apiFetch(`/satellites/${id}`);

// ── 转发器（含频率/波束/开关状态） ───────────────────────────
export const fetchTransponders = (satelliteId: number): Promise<Transponder[]> =>
  apiFetch(`/transponders/${satelliteId}`);

// ── 频率块（按开关） ──────────────────────────────────────────
export const fetchFrequencyBlocks = (switchId: number): Promise<FrequencyBlock[]> =>
  apiFetch(`/frequency-blocks/${switchId}`);

// ── 频率块（按卫星，含完整关联字段，供报表/管理页） ──────────
export const fetchFrequencyBlocksBySatellite = (satelliteId: number): Promise<FrequencyBlockFull[]> =>
  apiFetch(`/frequency-blocks/satellite/${satelliteId}`);

// ── 新建频率块 ────────────────────────────────────────────────
export const createFrequencyBlock = (data: Partial<FrequencyBlock>): Promise<{ id: number }> =>
  apiFetch('/frequency-blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ── 更新频率块 ────────────────────────────────────────────────
export const updateFrequencyBlock = (
  id: number,
  data: Partial<FrequencyBlock>,
): Promise<{ ok: boolean }> =>
  apiFetch(`/frequency-blocks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ── 删除频率块 ────────────────────────────────────────────────
export const deleteFrequencyBlock = (id: number): Promise<{ ok: boolean }> =>
  apiFetch(`/frequency-blocks/${id}`, { method: 'DELETE' });

// ── 修改通道常用名称 ──────────────────────────────────────────
export const updateChannelCommonName = (
  channelId: number,
  commonName: string,
): Promise<{ ok: boolean }> =>
  apiFetch(`/channels/${channelId}/common-name`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commonName }),
  });

// ── 资源统计（设计带宽 / 在用带宽 / 使用类型，服务端聚合） ─────
export const fetchStats = (satelliteId: number): Promise<BandwidthStats> =>
  apiFetch(`/stats/${satelliteId}`);

// ── 冲突检测用：某开关的占用列表（排除指定记录 ID） ──────────
export async function fetchFrequencyBlocksForConflict(
  switchId: number,
  excludeId?: number,
): Promise<Pick<FrequencyBlock, 'id' | 'frequencyOffset' | 'occupiedBandwidth'>[]> {
  const all = await fetchFrequencyBlocks(switchId);
  return all
    .filter((b) => excludeId == null || b.id !== excludeId)
    .map((b) => ({ id: b.id, frequencyOffset: b.frequencyOffset, occupiedBandwidth: b.occupiedBandwidth }));
}

// ── 行波管 TWT ────────────────────────────────────────────────
export const fetchTwts = (satelliteId: number): Promise<Twt[]> =>
  apiFetch(`/twt/satellite/${satelliteId}`);

export const updateTwt = (
  id: number,
  data: Partial<Pick<Twt, 'onOff' | 'mutingStatus' | 'gainMode' | 'gainLevel'>>,
): Promise<{ ok: boolean }> =>
  apiFetch(`/twt/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ── 通道属性（增益 / SFD） ────────────────────────────────────
export const fetchChannelAttributes = (satelliteId: number): Promise<ChannelAttribute[]> =>
  apiFetch(`/channel-attributes/satellite/${satelliteId}`);

// ── 开关组 ────────────────────────────────────────────────────
export const fetchSwitchGroups = (satelliteId: number): Promise<SwitchGroup[]> =>
  apiFetch(`/switch-groups/satellite/${satelliteId}`);

// ── 合约记录（新） ────────────────────────────────────────────
export const fetchContracts = (satelliteCode?: string): Promise<ContractRecord[]> =>
  apiFetch(`/contracts${satelliteCode ? `?satellite=${encodeURIComponent(satelliteCode)}` : ''}`);

// ── 商品实例清单 ──────────────────────────────────────────────
export const fetchProductInstances = (): Promise<ProductInstance[]> =>
  apiFetch('/product-instances');
