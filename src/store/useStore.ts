import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Database } from 'sql.js';

export type Role = 'business' | 'product' | 'project_manager' | 'delivery' | 'satellite_engineer';

interface StoreState {
  db: Database | null;
  dbReady: boolean;
  role: Role | null;
  selectedSatelliteId: number | null;
  setDB: (db: Database) => void;
  setRole: (role: Role) => void;
  setSatellite: (id: number) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      db: null,
      dbReady: false,
      role: null,
      selectedSatelliteId: null,
      setDB: (db) => set({ db, dbReady: true }),
      setRole: (role) => set({ role }),
      setSatellite: (id) => set({ selectedSatelliteId: id }),
    }),
    {
      name: 'rfmatrix-store',
      // db 是 WASM 对象，不能序列化，只持久化 role 和 selectedSatelliteId
      partialize: (state) => ({
        role: state.role,
        selectedSatelliteId: state.selectedSatelliteId,
      }),
    },
  ),
);

