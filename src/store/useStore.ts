import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role =
  | 'business_manager'
  | 'product_manager'
  | 'product_rd'
  | 'industry_manager'
  | 'ops_engineer'
  | 'network_engineer'
  | 'digital_engineer'
  | 'inventory_manager'
  | 'ttc_engineer';

interface StoreState {
  role: Role | null;
  selectedSatelliteId: number | null;
  setRole: (role: Role) => void;
  setSatellite: (id: number) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      role: null,
      selectedSatelliteId: null,
      setRole: (role) => set({ role }),
      setSatellite: (id) => set({ selectedSatelliteId: id }),
    }),
    { name: 'rfmatrix-store' },
  ),
);

