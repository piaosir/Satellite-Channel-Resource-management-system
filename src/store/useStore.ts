import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreState {
  selectedSatelliteId: number | null;
  dataVersion: number;
  setSatellite: (id: number) => void;
  bumpDataVersion: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      selectedSatelliteId: null,
      dataVersion: 0,
      setSatellite: (id) => set({ selectedSatelliteId: id }),
      bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
    }),
    { name: 'crms-store' },
  ),
);
