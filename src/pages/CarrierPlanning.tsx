import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Popconfirm,
  Tag, Badge, Tooltip, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import FilterBar from '@/components/FilterBar';
import OccupationForm from '@/components/OccupationForm';
import FreqPlanView from '@/components/FreqPlanView';
import { useStore } from '@/store/useStore';
import { fetchTransponders, fetchFrequencyBlocksBySatellite, deleteFrequencyBlock } from '@/api';
import type { Transponder, FrequencyBlock, FrequencyBlockFull } from '@/types';
import type { FilterValues } from '@/components/FilterBar';
import { fmtPolarization, fmtChannelLabel } from '@/utils/freqCalc';

const DARK = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  muted: '#64748b',
};

const USAGE_COLOR: Record<string, string> = {
  出租: 'blue',
  合作: 'green',
  自用: 'purple',
  禁用: 'error',
};

function planStatusLabel(o: FrequencyBlock): string {
  if (o.usageType === '禁用') return '禁用';
  if (o.partitionStatus === 'R') return '回收';
  return o.usageType ?? '划分';
}
function planStatusColor(o: FrequencyBlock): string {
  if (o.usageType === '禁用') return 'error';
  if (o.partitionStatus === 'R') return USAGE_COLOR[o.usageType ?? ''] ?? 'green';
  return USAGE_COLOR[o.usageType ?? ''] ?? 'blue';
}

export default function CarrierPlanning() {
  const navigate = useNavigate();
  const { role, selectedSatelliteId, bumpDataVersion } = useStore();

  const [transponders, setTransponders] = useState<Transponder[]>([]);
  const [allBlocks, setAllBlocks]       = useState<FrequencyBlockFull[]>([]);
  const [filters, setFilters]           = useState<FilterValues>({});

  const availableBands = useMemo(
    () => [...new Set(transponders.map((t) => t.band).filter(Boolean))].sort() as string[],
    [transponders],
  );
  const availablePolarizations = useMemo(
    () => [...new Set(transponders.map((t) => t.polarization).filter(Boolean))].sort() as string[],
    [transponders],
  );
  const availableTransponders = useMemo(
    () => transponders.map((t) => ({ switchId: t.switchId, label: fmtChannelLabel(t) })),
    [transponders],
  );

  const [formOpen, setFormOpen]               = useState(false);
  const [editRecord, setEditRecord]           = useState<FrequencyBlock | null>(null);
  const [initTransponder, setInitTransponder] = useState<Transponder | null>(null);

  useEffect(() => {
    if (role === null) navigate('/', { replace: true });
  }, [role, navigate]);

  const reload = useCallback(() => {
    if (!selectedSatelliteId) return;
    fetchTransponders(selectedSatelliteId).then(setTransponders).catch(console.error);
    fetchFrequencyBlocksBySatellite(selectedSatelliteId).then(setAllBlocks).catch(console.error);
  }, [selectedSatelliteId]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    return allBlocks.filter((o) => {
      if (filters.transponderSwitchId !== undefined && o.switchId !== filters.transponderSwitchId) return false;
      if (filters.band         && o.band !== filters.band)               return false;
      if (filters.polarization && o.polarization !== filters.polarization) return false;
      if (filters.switchStatus !== undefined && o.switchStatus !== filters.switchStatus) return false;
      if (filters.occStatus    && o.partitionStatus !== filters.occStatus) return false;
      return true;
    });
  }, [allBlocks, filters]);

  function openCreate(tp?: Transponder) {
    setEditRecord(null);
    setInitTransponder(tp ?? null);
    setFormOpen(true);
  }

  function openEdit(record: FrequencyBlockFull) {
    const base: FrequencyBlock = {
      id:                  record.id,
      frequencyBlockCode:  record.frequencyBlockCode,
      frequencyBlockCode2: record.frequencyBlockCode2,
      switchId:            record.switchId,
      switchCode:          record.switchCode,
      occupiedBandwidth:   record.occupiedBandwidth,
      frequencyOffset:     record.frequencyOffset,
      partitionStatus:     record.partitionStatus,
      usageType:           record.usageType,
      statusUpdateTime:    record.statusUpdateTime,
      uplinkStartFreq:     record.uplinkStartFreq,
      uplinkEndFreq:       record.uplinkEndFreq,
      downlinkStartFreq:   record.downlinkStartFreq,
      downlinkEndFreq:     record.downlinkEndFreq,
    };
    setEditRecord(base);
    setInitTransponder(null);
    setFormOpen(true);
  }

  async function handleDelete(id: number) {
    await deleteFrequencyBlock(id);
    bumpDataVersion();
    message.success('已删除规划块');
    reload();
  }

  const columns: ColumnsType<FrequencyBlockFull> = [
    {
      title: '通道',
      dataIndex: 'inputChannelShortName',
      width: 150,
      render: (_v, record) => (
        <span style={{ color: DARK.text, fontWeight: 500, fontFamily: 'monospace' }}>
          {fmtChannelLabel(record)}
        </span>
      ),
      sorter: (a, b) => fmtChannelLabel(a).localeCompare(fmtChannelLabel(b)),
    },
    {
      title: '频段',
      dataIndex: 'band',
      width: 70,
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
      title: '用途',
      dataIndex: 'usageType',
      width: 80,
      render: (v) => v
        ? <Tag color={USAGE_COLOR[v] ?? 'default'}>{v}</Tag>
        : <span style={{ color: DARK.muted }}>未设置</span>,
      filters: [
        { text: '出租', value: '出租' },
        { text: '合作', value: '合作' },
        { text: '自用', value: '自用' },
        { text: '禁用', value: '禁用' },
        { text: '未设置', value: '' },
      ],
      onFilter: (value, record) => (record.usageType ?? '') === value,
    },
    {
      title: '规划状态',
      width: 100,
      render: (_, r) => <Tag color={planStatusColor(r)}>{planStatusLabel(r)}</Tag>,
    },
    {
      title: '上行波束',
      dataIndex: 'antennaName',
      width: 100,
      render: (v) => v ?? <span style={{ color: DARK.muted }}>—</span>,
    },
    {
      title: '频率块代码',
      dataIndex: 'frequencyBlockCode2',
      ellipsis: true,
      width: 230,
    },
    {
      title: '上行频率段',
      width: 170,
      render: (_, r) => (
        r.uplinkStartFreq != null
          ? `${r.uplinkStartFreq.toFixed(2)} ~ ${r.uplinkEndFreq?.toFixed(2)} MHz`
          : '—'
      ),
    },
    {
      title: '下行频率段',
      width: 170,
      render: (_, r) => (
        r.downlinkStartFreq != null
          ? `${r.downlinkStartFreq.toFixed(2)} ~ ${r.downlinkEndFreq?.toFixed(2)} MHz`
          : '—'
      ),
    },
    {
      title: '偏移量',
      dataIndex: 'frequencyOffset',
      width: 80,
      render: (v) => `${v} MHz`,
    },
    {
      title: '规划带宽',
      dataIndex: 'occupiedBandwidth',
      width: 85,
      render: (v) => `${v} MHz`,
      sorter: (a, b) => a.occupiedBandwidth - b.occupiedBandwidth,
    },
    {
      title: '开关',
      dataIndex: 'switchStatus',
      width: 60,
      render: (v) => (
        <Badge status={v === 1 ? 'success' : 'error'} text={v === 1 ? '开' : '关'} />
      ),
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="编辑规划块">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              style={{ color: '#60a5fa' }}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该规划块？"
            description="关联的占用记录不受影响，但将失去规划上下文。"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除规划块">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const pStats = useMemo(() => {
    const total = allBlocks.length;
    const byType = allBlocks.reduce<Record<string, number>>((acc, b) => {
      const key = b.usageType ?? '未设置';
      acc[key] = (acc[key] ?? 0) + b.occupiedBandwidth;
      return acc;
    }, {});
    const totalBw = allBlocks.reduce((s, b) => s + b.occupiedBandwidth, 0);
    return { total, byType, totalBw };
  }, [allBlocks]);

  return (
    <div>
      <FilterBar
        onFilter={setFilters}
        availableTransponders={availableTransponders}
        availableBands={availableBands}
        availablePolarizations={availablePolarizations}
      />

      {/* 统计栏 */}
      <div style={{
        padding: '8px 24px',
        background: DARK.card,
        borderBottom: `1px solid ${DARK.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: DARK.muted, fontSize: 12 }}>
            规划块：<b style={{ color: DARK.text }}>{pStats.total}</b> 条
            {filtered.length !== allBlocks.length && `，筛选后 ${filtered.length} 条`}
          </span>
          <span style={{ color: DARK.muted, fontSize: 12 }}>
            总规划带宽：<b style={{ color: DARK.text }}>{pStats.totalBw.toFixed(1)} MHz</b>
          </span>
          {Object.entries(pStats.byType).map(([k, bw]) => (
            <span key={k} style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: 2,
                background: k === '出租' ? '#1677ff' : k === '合作' ? '#52c41a' : k === '自用' ? '#8b5cf6' : k === '禁用' ? '#ff4d4f' : '#475569',
              }} />
              {k}：{bw.toFixed(1)} MHz
            </span>
          ))}
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openCreate()}
          style={{ background: '#2563eb', borderColor: '#2563eb' }}
        >
          新建规划块
        </Button>
      </div>

      <div style={{ padding: '16px 24px' }}>
        <FreqPlanView
          transponders={transponders}
          items={allBlocks}
          onEdit={(id) => {
            const record = allBlocks.find((b) => b.id === id);
            if (record) openEdit(record);
          }}
          onDelete={(id) => handleDelete(id)}
        />

        <div style={{ marginTop: 16 }} />

        <Table<FrequencyBlockFull>
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          scroll={{ x: 1600 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            defaultPageSize: 20,
          }}
          style={{ background: DARK.card, borderRadius: 8 }}
          rowClassName={() => 'occ-row'}
        />
      </div>

      <OccupationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => { reload(); message.success(editRecord ? '规划块已更新' : '规划块已新建'); }}
        editRecord={editRecord}
        transponders={transponders}
        initTransponder={initTransponder}
      />
    </div>
  );
}
