import type { Role } from '@/store/useStore';

export const PERMISSIONS = {
  canAccessQuery:        (r: Role) => r !== 'digital_engineer',
  canAccessStats:        (r: Role) => r !== 'digital_engineer' && r !== 'ttc_engineer',
  canAccessContracts:    (r: Role) => ['business_manager', 'industry_manager', 'network_engineer', 'digital_engineer'].includes(r),
  canAccessUsage:        (r: Role) => ['business_manager', 'industry_manager', 'ops_engineer', 'network_engineer'].includes(r),
  canManageOccupation:   (r: Role) => r === 'industry_manager' || r === 'network_engineer',
  canDeleteOccupation:   (r: Role) => r === 'industry_manager' || r === 'network_engineer',
  canEditChannelName:    (r: Role) => r === 'industry_manager' || r === 'network_engineer',
  canAccessPlanning:     (r: Role) => r === 'product_rd',
  canAccessGround:       (r: Role) => r === 'network_engineer',
  canAccessChannelConfig:(r: Role) => r === 'ttc_engineer',
  canAccessTWTA:         (r: Role) => r === 'ttc_engineer',
  canExportReport:       (_r: Role) => true,
} as const;
