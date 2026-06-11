/**
 * 通道资源管理系统 — API 客户端(后端 v2.0,/docs 为契约源)
 */
import type {
  Satellite, Beacon, ChannelGroup, Channel, Matrix, MatrixPort, MatrixSwitch,
  SwitchLog, ReceiverLog, PlanningBlock, AllocationBlock,
  Customer, UserInfo, Contract, DeliveryRecord,
  BusinessSystem, Carrier, CarrierUsageRecord, SatelliteStats, UsageType,
} from '@/types';

const BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `API 错误 ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const jsonBody = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// ── 资源层:卫星 / 信标 ────────────────────────────────────────
export const fetchSatellites = (): Promise<Satellite[]> =>
  apiFetch('/satellites');

export const fetchSatelliteDetail = (id: number): Promise<Satellite> =>
  apiFetch(`/satellites/${id}`);

export const fetchBeacons = (satelliteId: number): Promise<Beacon[]> =>
  apiFetch(`/satellites/${satelliteId}/beacons`);

// ── 资源层:通道组 / 通道 ──────────────────────────────────────
export const fetchChannelGroups = (satelliteId: number): Promise<ChannelGroup[]> =>
  apiFetch(`/satellites/${satelliteId}/channel-groups`);

export const fetchChannels = (satelliteId: number): Promise<Channel[]> =>
  apiFetch(`/satellites/${satelliteId}/channels`);

export const updateChannelCommonName = (channelId: number, commonName: string) =>
  apiFetch<{ ok: boolean }>(`/channels/${channelId}/common-name`,
    jsonBody('PATCH', { commonName }));

export const switchReceiver = (groupId: number, data: {
  receiverActiveStatus: string; operator?: string; registrar?: string;
}) =>
  apiFetch<{ ok: boolean }>(`/channel-groups/${groupId}/receiver`, jsonBody('PATCH', data));

export const fetchReceiverLogs = (channelGroupCode?: string): Promise<ReceiverLog[]> =>
  apiFetch(`/logs/receiver${channelGroupCode ? `?channelGroupCode=${encodeURIComponent(channelGroupCode)}` : ''}`);

// ── 资源层:矩阵 / 端口 / 开关 ─────────────────────────────────
export const fetchMatrices = (satelliteId: number, effectiveOnly = true): Promise<Matrix[]> =>
  apiFetch(`/satellites/${satelliteId}/matrices?effective_only=${effectiveOnly}`);

export const fetchMatrixPorts = (matrixId: number): Promise<MatrixPort[]> =>
  apiFetch(`/matrices/${matrixId}/ports`);

export const fetchSwitches = (satelliteId: number): Promise<MatrixSwitch[]> =>
  apiFetch(`/satellites/${satelliteId}/switches`);

export const fetchMatrixSwitches = (matrixId: number): Promise<MatrixSwitch[]> =>
  apiFetch(`/matrices/${matrixId}/switches`);

export const toggleSwitch = (switchId: number, data: {
  switchStatus: number; operator?: string; registrar?: string;
}) =>
  apiFetch<{ ok: boolean }>(`/switches/${switchId}/status`, jsonBody('PATCH', data));

export const switchAmplifier = (switchId: number, data: {
  ampActiveStatus: string; operator?: string; registrar?: string;
}) =>
  apiFetch<{ ok: boolean }>(`/switches/${switchId}/amplifier`, jsonBody('PATCH', data));

export const fetchSwitchLogs = (switchCode?: string): Promise<SwitchLog[]> =>
  apiFetch(`/logs/matrix-switch${switchCode ? `?switchCode=${encodeURIComponent(switchCode)}` : ''}`);

export const fetchAmplifierLogs = (switchCode?: string): Promise<SwitchLog[]> =>
  apiFetch(`/logs/amplifier${switchCode ? `?switchCode=${encodeURIComponent(switchCode)}` : ''}`);

// ── 状态层:通道规划状态(基底) ────────────────────────────────
export const fetchPlanningBlocks = (
  satelliteId: number,
  opts?: { usageType?: UsageType; validOnly?: boolean },
): Promise<PlanningBlock[]> => {
  const q = new URLSearchParams();
  if (opts?.usageType) q.set('usage_type', opts.usageType);
  if (opts?.validOnly) q.set('valid_only', 'true');
  const qs = q.toString();
  return apiFetch(`/satellites/${satelliteId}/planning-blocks${qs ? `?${qs}` : ''}`);
};

export const createPlanningBlock = (data: Partial<PlanningBlock>) =>
  apiFetch<{ id: number; blockCode: string }>('/planning-blocks', jsonBody('POST', data));

export const updatePlanningBlock = (id: number, data: {
  usageType?: string; isValid?: number;
  uplinkStartFreq?: number; uplinkEndFreq?: number;
  downlinkStartFreq?: number; downlinkEndFreq?: number;
}) =>
  apiFetch<{ ok: boolean; blockCode: string }>(`/planning-blocks/${id}`, jsonBody('PUT', data));

export const deletePlanningBlock = (id: number) =>
  apiFetch<{ ok: boolean }>(`/planning-blocks/${id}`, { method: 'DELETE' });

// ── 状态层:通道分配状态(基于规划的实际占用) ──────────────────
export const fetchAllocationBlocks = (
  satelliteId: number, validOnly = false,
): Promise<AllocationBlock[]> =>
  apiFetch(`/satellites/${satelliteId}/allocation-blocks?valid_only=${validOnly}`);

export const fetchAllocationBlocksOfPlanning = (planningBlockId: number): Promise<AllocationBlock[]> =>
  apiFetch(`/planning-blocks/${planningBlockId}/allocation-blocks`);

export const createAllocationBlock = (data: Partial<AllocationBlock>) =>
  apiFetch<{ id: number; blockCode: string; planningBlockId: number }>(
    '/allocation-blocks', jsonBody('POST', data));

export const updateAllocationBlock = (id: number, data: {
  isValid?: number; uplinkStartFreq?: number; uplinkEndFreq?: number;
}) =>
  apiFetch<{ ok: boolean; blockCode: string; planningBlockId: number }>(
    `/allocation-blocks/${id}`, jsonBody('PUT', data));

export const deleteAllocationBlock = (id: number) =>
  apiFetch<{ ok: boolean }>(`/allocation-blocks/${id}`, { method: 'DELETE' });

// ── 业务层:客户 / 用户 / 合约 ─────────────────────────────────
export const fetchCustomers = (opts?: {
  search?: string; offset?: number; limit?: number;
}): Promise<{ total: number; items: Customer[] }> => {
  const q = new URLSearchParams();
  if (opts?.search) q.set('search', opts.search);
  if (opts?.offset != null) q.set('offset', String(opts.offset));
  if (opts?.limit != null) q.set('limit', String(opts.limit));
  const qs = q.toString();
  return apiFetch(`/customers${qs ? `?${qs}` : ''}`);
};

export const fetchCustomerDetail = (customerCode: string): Promise<Customer> =>
  apiFetch(`/customers/${encodeURIComponent(customerCode)}`);

export const fetchUsers = (): Promise<UserInfo[]> => apiFetch('/users');

export const fetchContracts = (opts?: {
  customerCode?: string; satellite?: string;
}): Promise<Contract[]> => {
  const q = new URLSearchParams();
  if (opts?.customerCode) q.set('customer_code', opts.customerCode);
  if (opts?.satellite) q.set('satellite', opts.satellite);
  const qs = q.toString();
  return apiFetch(`/contracts${qs ? `?${qs}` : ''}`);
};

export const fetchContractDetail = (id: number): Promise<Contract> =>
  apiFetch(`/contracts/${id}`);

// ── 业务层:交付过程记录(占用/释放) ───────────────────────────
export const fetchDeliveryRecordsOfBlock = (allocationId: number): Promise<DeliveryRecord[]> =>
  apiFetch(`/allocation-blocks/${allocationId}/delivery-records`);

export const fetchCarrierUsageRecordsOfBlock = (allocationId: number): Promise<CarrierUsageRecord[]> =>
  apiFetch(`/allocation-blocks/${allocationId}/carrier-usage-records`);

export const createDeliveryRecord = (data: {
  contractId: number; blockCode: string; action: '占用' | '释放';
  exclusiveType?: string; bandwidth?: number; handler?: string; registrar?: string;
}) =>
  apiFetch<{ id: number; allocationId: number }>('/delivery-records', jsonBody('POST', data));

// ── 业务层:自有业务系统 / 载波 / 使用记录 ─────────────────────
export const fetchBusinessSystems = (): Promise<BusinessSystem[]> =>
  apiFetch('/business-systems');

export const fetchCarriers = (businessSystemId?: number): Promise<Carrier[]> =>
  apiFetch(`/carriers${businessSystemId ? `?business_system_id=${businessSystemId}` : ''}`);

export const fetchCarrierUsageRecords = (opts?: {
  satellite?: string; carrierId?: number;
}): Promise<CarrierUsageRecord[]> => {
  const q = new URLSearchParams();
  if (opts?.satellite) q.set('satellite', opts.satellite);
  if (opts?.carrierId != null) q.set('carrier_id', String(opts.carrierId));
  const qs = q.toString();
  return apiFetch(`/carrier-usage-records${qs ? `?${qs}` : ''}`);
};

export const createCarrierUsageRecord = (data: {
  blockCode: string; action: '占用' | '释放'; carrierId?: number;
  exclusiveType?: string; bandwidth?: number; handler?: string; registrar?: string;
}) =>
  apiFetch<{ id: number; allocationId: number }>('/carrier-usage-records', jsonBody('POST', data));

// ── 统计 ──────────────────────────────────────────────────────
export const fetchStats = (satelliteId: number): Promise<SatelliteStats> =>
  apiFetch(`/satellites/${satelliteId}/stats`);
