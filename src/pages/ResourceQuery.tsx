import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Badge, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import FilterBar from '@/components/FilterBar';
import OccupationDrawer from '@/components/OccupationDrawer';
import FreqPlanView from '@/components/FreqPlanView';
import { useStore } from '@/store/useStore';
import { fetchTransponders, fetchOccupationRecordsBySatellite } from '@/api';
import type { Transponder, OccupationRecordFull } from '@/types';
import type { FilterValues } from '@/components/FilterBar';
import { fmtPolarization, fmtChannelLabel, fmtFreq } from '@/utils/freqCalc';

const DARK = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  muted: '#64748b',
};

const USAGE_COLOR: Record<string, string> = {
  出租: 'blue', 合作: 'green', 自用: 'purple', 禁用: 'error',
};

export default function ResourceQuery() {
  const navigate = useNavigate();
  const { role, selectedSatelliteId } = useStore();

  const [transponders, setTransponders] = useState<Transponder[]>([]);
  const [allOccs, setAllOccs]           = useState<OccupationRecordFull[]>([]);
  const [filters, setFilters]           = useState<FilterValues>({});
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [selected, setSelected]         = useState<Transponder | null>(null);

  const availableBands = useMemo(
    () => [...new Set(allOccs.map((o) => o.band).filter(Boolean))].sort() as string[],
    [allOccs],
  );
  const availablePolarizations = useMemo(
    () => [...new Set(allOccs.map((o) => o.polarization).filter(Boolean))].sort() as string[],
    [allOccs],
  );
  const availableTransponders = useMemo(
    () => transponders.map((t) => ({
      switchId: t.switchId,
      label: `${fmtChannelLabel(t)}（${t.band}${t.polarization ? ' ' + fmtPolarization(t.polarization) : ''}）`,
    })),
    [transponders],
  );

  useEffect(() => {
    if (role === null) navigate('/', { replace: true });
  }, [role, navigate]);

  const reload = useCallback(() => {
    if (!selectedSatelliteId) return;
    Promise.all([
      fetchTransponders(selectedSatelliteId),
      fetchOccupationRecordsBySatellite(selectedSatelliteId),
    ])
      .then(([tps, occs]) => {
        setTransponders(tps);
        setAllOccs(occs);
      })
      .catch(console.error);
  }, [selectedSatelliteId]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    return allOccs.filter((o) => {
      if (filters.transponderSwitchId !== undefined && o.switchId !== filters.transponderSwitchId) return false;
      if (filters.band         && o.band !== filters.band)               return false;
      if (filters.polarization && o.polarization !== filters.polarization) return false;
      if (filters.switchStatus !== undefined && o.switchStatus !== filters.switchStatus) return false;
      if (filters.occStatus    && o.partitionStatus !== filters.occStatus) return false;
      return true;
    });
  }, [allOccs, filters]);

  function handleRowClick(occ: OccupationRecordFull) {
    const tp = transponders.find((t) => t.switchId === occ.switchId) ?? null;
    setSelected(tp);
    setDrawerOpen(true);
  }

  const columns: ColumnsType<OccupationRecordFull> = [
    {
      title: '频率块',
      dataIndex: 'occupationCode',
      width: 220,
      ellipsis: true,
      render: (v: string | null, r) => {
        const display = v ?? r.planningBlockCode ?? '—';
        return (
          <Tooltip title={display}>
            <span style={{ color: DARK.text, fontWeight: 500, fontFamily: 'monospace', fontSize: 11 }}>
              {display}
            </span>
          </Tooltip>
        );
      },
      sorter: (a, b) => (a.occupationCode ?? '').localeCompare(b.occupationCode ?? ''),
    },
    {
      title: '频段',
      dataIndex: 'band',
      width: 68,
      render: (v) => (
        <Tag color={v === 'Ku' ? 'blue' : v === 'EKu' ? 'purple' : 'green'}>{v}</Tag>
      ),
    },
    {
      title: '极化',
      dataIndex: 'polarization',
      width: 72,
      render: (v) => fmtPolarization(v),
    },
    {
      title: '上行波束',
      dataIndex: 'antennaName',
      width: 100,
      render: (v) => v ?? <span style={{ color: DARK.muted }}>—</span>,
    },
    {
      title: '上行频率',
      width: 175,
      render: (_, r) =>
        r.uplinkStartFreq != null
          ? `${fmtFreq(r.uplinkStartFreq)} ~ ${fmtFreq(r.uplinkEndFreq!)} MHz`
          : <span style={{ color: DARK.muted }}>—</span>,
    },
    {
      title: '下行频率',
      width: 175,
      render: (_, r) =>
        r.downlinkStartFreq != null
          ? `${fmtFreq(r.downlinkStartFreq)} ~ ${fmtFreq(r.downlinkEndFreq!)} MHz`
          : <span style={{ color: DARK.muted }}>—</span>,
    },
    {
      title: '带宽',
      dataIndex: 'occupiedBandwidth',
      width: 80,
      render: (v) => `${v} MHz`,
      sorter: (a, b) => a.occupiedBandwidth - b.occupiedBandwidth,
    },
    {
      title: '用途',
      dataIndex: 'usageType',
      width: 80,
      render: (v) =>
        v ? <Tag color={USAGE_COLOR[v] ?? 'default'}>{v}</Tag>
          : <span style={{ color: DARK.muted }}>—</span>,
      filters: [
        { text: '出租', value: '出租' },
        { text: '合作', value: '合作' },
        { text: '自用', value: '自用' },
        { text: '禁用', value: '禁用' },
      ],
      onFilter: (value, record) => record.usageType === value,
    },
    {
      title: '状态',
      dataIndex: 'partitionStatus',
      width: 88,
      render: (v: string | null, r) => {
        if (v === 'R') return <Tag color="default">回收</Tag>;
        return <Tag color={USAGE_COLOR[r.usageType ?? ''] ?? 'blue'}>{r.usageType ?? '划分'}</Tag>;
      },
    },
    {
      title: '所属通道',
      width: 130,
      render: (_, r) => (
        <span style={{ color: DARK.muted, fontSize: 11, fontFamily: 'monospace' }}>
          {fmtChannelLabel(r)}
        </span>
      ),
    },
    {
      title: '开关',
      dataIndex: 'switchStatus',
      width: 60,
      render: (v) => (
        <Badge status={v === 1 ? 'success' : 'error'} text={v === 1 ? '开' : '关'} />
      ),
    },
  ];

  return (
    <div>
      <FilterBar
        onFilter={setFilters}
        availableTransponders={availableTransponders}
        availableBands={availableBands}
        availablePolarizations={availablePolarizations}
      />

      <div style={{
        padding: '8px 24px',
        background: DARK.card,
        borderBottom: `1px solid ${DARK.border}`,
      }}>
        <span style={{ color: DARK.muted, fontSize: 12 }}>
          当前卫星共 <b style={{ color: DARK.text }}>{allOccs.length}</b> 条分配记录
          {filtered.length !== allOccs.length && `，筛选后 ${filtered.length} 条`}
          　点击行查看通道详情
        </span>
      </div>

      <div style={{ padding: '16px 24px' }}>
        <FreqPlanView transponders={transponders} items={allOccs} />

        <div style={{ marginTop: 16 }} />

        <Table<OccupationRecordFull>
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            defaultPageSize: 20,
          }}
          style={{ background: DARK.card, borderRadius: 8 }}
          rowClassName={() => 'occ-row'}
          onRow={(occ) => ({
            onClick: () => handleRowClick(occ),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      <OccupationDrawer
        open={drawerOpen}
        transponder={selected}
        transponders={transponders}
        onClose={() => setDrawerOpen(false)}
        onOccChange={reload}
      />
    </div>
  );
}
