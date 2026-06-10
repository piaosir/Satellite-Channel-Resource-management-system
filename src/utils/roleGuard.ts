import type { Role } from '@/store/useStore';

export const PERMISSIONS = {
  canAccessQuery:           (r: Role) => r !== 'digital_engineer',
  canAccessStats:           (r: Role) => r !== 'digital_engineer' && r !== 'ttc_engineer',
  canAccessContracts:       (r: Role) => ['business_manager', 'industry_manager', 'network_engineer', 'digital_engineer'].includes(r),
  canAccessUsage:           (r: Role) => ['business_manager', 'industry_manager', 'ops_engineer', 'network_engineer'].includes(r),
  /** 通道规划管理（frequency_block_realtime_status）— 网络规划工程师专属 */
  canManagePlanningBlocks:  (r: Role) => r === 'product_rd',
  canAccessPlanning:        (r: Role) => r === 'product_rd',
  /** 通道占用管理（occupation_realtime_status）— 分频工程师（行业经理/网络系统工程师） */
  canManageOccupation:      (r: Role) => r === 'industry_manager' || r === 'network_engineer',
  canDeleteOccupation:      (r: Role) => r === 'industry_manager' || r === 'network_engineer',
  canEditChannelName:       (r: Role) => r === 'industry_manager' || r === 'network_engineer',
  canAccessGround:          (r: Role) => r === 'network_engineer',
  canAccessChannelConfig:   (r: Role) => r === 'ttc_engineer',
  canAccessTWTA:            (r: Role) => r === 'ttc_engineer',
  canExportReport:          (_r: Role) => true,
} as const;
