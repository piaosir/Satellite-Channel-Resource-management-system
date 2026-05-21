import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FilterBar from '@/components/FilterBar';
import TransponderTable from '@/components/TransponderTable';
import OccupationDrawer from '@/components/OccupationDrawer';
import { useStore } from '@/store/useStore';
import { fetchTransponders, fetchFrequencyBlocks } from '@/api';
import type { Transponder, FrequencyBlock } from '@/types';
import type { FilterValues } from '@/components/FilterBar';
import { fmtPolarization } from '@/utils/freqCalc';

export default function ResourceQuery() {
  const navigate = useNavigate();
  const { role, selectedSatelliteId } = useStore();
  const [all, setAll] = useState<Transponder[]>([]);

  // 当前卫星实际存在的频段、极化、通道列表（用于 FilterBar 动态选项）
  const availableBands = useMemo(
    () => [...new Set(all.map((t) => t.band).filter(Boolean))].sort() as string[],
    [all],
  );
  const availablePolarizations = useMemo(
    () => [...new Set(all.map((t) => t.polarization).filter(Boolean))].sort() as string[],
    [all],
  );
  const availableTransponders = useMemo(
    () => all.map((t) => ({
      switchId: t.switchId,
      label: `${t.transponderName}（${t.band}${t.polarization ? ' ' + fmtPolarization(t.polarization) : ''}）`,
    })),
    [all],
  );
  const [occMap, setOccMap] = useState<Record<number, FrequencyBlock[]>>({});
  const [filters, setFilters] = useState<FilterValues>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Transponder | null>(null);

  // 若未选角色，跳回角色选择页（仅在 role 真正为空时触发，持久化后刷新不受影响）
  useEffect(() => {
    if (role === null) navigate('/', { replace: true });
  }, [role, navigate]);

  // 加载通道列表
  const reloadTransponders = useCallback(() => {
    if (!selectedSatelliteId) return;
    fetchTransponders(selectedSatelliteId).then(setAll).catch(console.error);
  }, [selectedSatelliteId]);

  useEffect(() => {
    reloadTransponders();
  }, [reloadTransponders]);

  // 加载所有通道的占用数据（当卫星/通道列表变化时重载）
  const reloadOccMap = useCallback(() => {
    if (all.length === 0) return;
    Promise.all(all.map((t) => fetchFrequencyBlocks(t.switchId).then((list) => [t.switchId, list] as const)))
      .then((entries) => setOccMap(Object.fromEntries(entries)))
      .catch(console.error);
  }, [all]);

  useEffect(() => {
    reloadOccMap();
  }, [reloadOccMap]);

  // 前端筛选（通道 / 频段 / 极化 / 开关状态 / 占用状态）
  const filtered = useMemo(() => {
    return all.filter((t) => {
      if (filters.transponderSwitchId !== undefined && t.switchId !== filters.transponderSwitchId) return false;
      if (filters.band         && t.band !== filters.band)                                         return false;
      if (filters.polarization && t.polarization !== filters.polarization)                         return false;
      if (filters.switchStatus !== undefined && t.switchStatus !== filters.switchStatus)           return false;
      if (filters.occStatus) {
        const occs = occMap[t.switchId] ?? [];
        if (!occs.some((o) => o.partitionStatus === filters.occStatus)) return false;
      }
      return true;
    });
  }, [all, filters, occMap]);

  function handleRowClick(t: Transponder) {
    setSelected(t);
    setDrawerOpen(true);
  }

  return (
    <div>
      <FilterBar
        onFilter={setFilters}
        availableTransponders={availableTransponders}
        availableBands={availableBands}
        availablePolarizations={availablePolarizations}
      />
      <div style={{ padding: '16px 24px' }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
          当前卫星共 <b style={{ color: '#e2e8f0' }}>{all.length}</b> 个通道
          {filtered.length !== all.length && `，筛选后 ${filtered.length} 个`}
          　点击行查看频谱详情
        </div>
        <TransponderTable transponders={filtered} occMap={occMap} onRowClick={handleRowClick} />
      </div>
      <OccupationDrawer
        open={drawerOpen}
        transponder={selected}
        transponders={all}
        onClose={() => setDrawerOpen(false)}
        onOccChange={reloadOccMap}
        onTransponderChange={reloadTransponders}
      />
    </div>
  );
}

