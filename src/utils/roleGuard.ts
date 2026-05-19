import type { Role } from '@/store/useStore';

export const PERMISSIONS = {
  canManageOccupation: (role: Role) => role === 'delivery' || role === 'satellite_engineer',
  canViewQuery:        (_role: Role) => true,
  canExportReport:     (_role: Role) => true,
  canDeleteOccupation: (role: Role) => role === 'delivery' || role === 'satellite_engineer',
} as const;
