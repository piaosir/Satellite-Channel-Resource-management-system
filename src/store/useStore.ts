import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'business' | 'product' | 'project_manager' | 'delivery' | 'satellite_engineer';

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

