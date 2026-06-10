import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Popconfirm,
  Tag, Badge, Tooltip, message, Input,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import FilterBar from '@/components/FilterBar';
import OccupationRecordForm from '@/components/OccupationRecordForm';
import FreqPlanView from '@/components/FreqPlanView';
import { useStore } from '@/store/useStore';
import {
  fetchTransponders, fetchFrequencyBlocksBySatellite,
  fetchOccupationRecordsBySatellite, deleteOccupationRecord,
} from '@/api';
import type { Transponder, FrequencyBlock, OccupationRecord, OccupationRecordFull } from '@/types';
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
  出租: 'blue', 合作: 'green', 自用: 'purple', 禁用: 'error',
};

function occStatusLabel(o: OccupationRecord): string {
  if (o.blockValid === 0) return '无效';
  if (o.usageType === '禁用') return '禁用';
  return o.usageType ?? '有效';
}
function occStatusColor(o: OccupationRecord): string {
  if (o.blockValid === 0) return 'default';
  if (o.usageType === '禁用') return 'error';
  return USAGE_COLOR[o.usageType ?? ''] ?? 'blue';
}

export default function OccupationManage() {
  const navigate = useNavigate();
  const { role, selectedSatelliteId, bumpDataVersion } = useStore();

  const [transponders, setTransponders]       = useState<Transponder[]>([]);
  const [planningBlocks, setPlanningBlocks]   = useState<FrequencyBlock[]>([]);
  const [allOccs, setAllOccs]                 = useState<OccupationRecordFull[]>([]);
  const [filters, setFilters]                 = useState<FilterValues>({});
  const [userSearch, setUserSearch]           = useState('');

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

  const [formOpen, setFormOpen]     = useState(false);
  const [editRecord, setEditRecord] = useState<OccupationRecord | null>(null);

  useEffect(() => {
    if (role === null) navigate('/', { replace: true });
  }, [role, navigate]);

  const reload = useCallback(() => {
    if (!selectedSatelliteId) return;
    fetchTransponders(selectedSatelliteId).then(setTransponders).catch(console.error);
    fetchFrequencyBlocksBySatellite(selectedSatelliteId)
      .then((blocks) => setPlanningBlocks(blocks.filter((b) => b.partitionStatus === 'P')))
      .catch(console.error);
    fetchOccupationRecordsBySatellite(selectedSatelliteId).then(setAllOccs).catch(console.error);
  }, [selectedSatelliteId]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    return allOccs.filter((o) => {
      if (filters.transponderSwitchId !== undefined && o.switchId !== filters.transponderSwitchId) return false;
      if (filters.band         && o.band !== filters.band)               return false;
      if (filters.polarization && o.polarization !== filters.polarization) return false;
      if (filters.switchStatus !== undefined && o.switchStatus !== filters.switchStatus) return false;
      if (filters.occStatus    && String(o.blockValid ?? 1) !== filters.occStatus) return false;
      if (userSearch) {
        const q = userSearch.toLowerCase();
        const match = (o.remarkUser ?? '').toLowerCase().includes(q)
          || (o.remarkFulfillment ?? '').toLowerCase().includes(q)
          || (o.planningBlockCode ?? '').toLowerCase().includes(q)
          || (o.usageType ?? '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allOccs, filters, userSearch]);

  function openCreate() {
    setEditRecord(null);
    setFormOpen(true);
  }

  function openEdit(record: OccupationRecordFull) {
    const base: OccupationRecord = {
      id:                record.id,
      occupationCode:    record.occupationCode,
      planningBlockId:   record.planningBlockId,
      planningBlockCode: record.planningBlockCode,
      switchId:          record.switchId,
      switchCode:        record.switchCode,
      occupiedBandwidth: record.occupiedBandwidth,
      frequencyOffset:   record.frequencyOffset,
      blockValid:        record.blockValid,
      usageType:         record.usageType,
      statusUpdateTime:  record.statusUpdateTime,
      uplinkStartFreq:   record.uplinkStartFreq,
      uplinkEndFreq:     record.uplinkEndFreq,
      downlinkStartFreq: record.downlinkStartFreq,
      downlinkEndFreq:   record.downlinkEndFreq,
      remarkFulfillment: record.remarkFulfillment,
      remarkUser:        record.remarkUser,
      remarkSales:       record.remarkSales,
    };
    setEditRecord(base);
    setFormOpen(true);
  }

  async function handleDelete(id: number) {
    await deleteOccupationRecord(id);
    bumpDataVersion();
    message.success('已删除占用记录');
    reload();
  }

  const columns: ColumnsType<OccupationRecordFull> = [
    {
      title: '频率块',
      dataIndex: 'occupationCode',
      width: 220,
      ellipsis: true,
      render: (v: string | null, record) => {
        const display = v ?? record.planningBlockCode ?? '—';
        return (
          <Tooltip title={`${display}\n通道：${fmtChannelLabel(record)}`}>
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
      title: '占用状态',
      width: 90,
      render: (_, r) => <Tag color={occStatusColor(r)}>{occStatusLabel(r)}</Tag>,
    },
    {
      title: '规划块',
      dataIndex: 'planningBlockCode',
      width: 200,
      ellipsis: true,
      render: (v, r) => (
        <Tooltip title={v ?? '未关联规划块'}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: v ? '#60a5fa' : DARK.muted }}>
            {v ?? <span style={{ color: DARK.muted }}>—</span>}
          </span>
          {r.planningUsageType && (
            <Tag color={USAGE_COLOR[r.planningUsageType] ?? 'default'}
              style={{ marginLeft: 4, fontSize: 10, padding: '0 4px' }}>
              {r.planningUsageType}
            </Tag>
          )}
        </Tooltip>
      ),
    },
    {
      title: '上行频率段',
      width: 175,
      render: (_, r) => (
        r.uplinkStartFreq != null
          ? `${r.uplinkStartFreq.toFixed(2)} ~ ${r.uplinkEndFreq?.toFixed(2)} MHz`
          : '—'
      ),
    },
    {
      title: '下行频率段',
      width: 175,
      render: (_, r) => (
        r.downlinkStartFreq != null
          ? `${r.downlinkStartFreq.toFixed(2)} ~ ${r.downlinkEndFreq?.toFixed(2)} MHz`
          : '—'
      ),
    },
    {
      title: '占用带宽',
      dataIndex: 'occupiedBandwidth',
      width: 85,
      render: (v) => `${v} MHz`,
      sorter: (a, b) => a.occupiedBandwidth - b.occupiedBandwidth,
    },
    {
      title: '履约状态',
      dataIndex: 'remarkFulfillment',
      width: 120,
      ellipsis: true,
      render: (v) => v ?? <span style={{ color: DARK.muted }}>—</span>,
    },
    {
      title: '用户',
      dataIndex: 'remarkUser',
      width: 100,
      ellipsis: true,
      render: (v) => v ?? <span style={{ color: DARK.muted }}>—</span>,
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
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              style={{ color: '#60a5fa' }}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该占用记录？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除" cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
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
        occStatusOptions={[
          { value: '1', label: '✅ 有效' },
          { value: '0', label: '⛔ 无效' },
        ]}
        occStatusPlaceholder="分配块状态"
      />

      <div style={{
        padding: '8px 24px',
        background: DARK.card,
        borderBottom: `1px solid ${DARK.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: DARK.muted, fontSize: 12 }}>
            共 <b style={{ color: DARK.text }}>{allOccs.length}</b> 条占用记录
            {filtered.length !== allOccs.length && `，筛选后 ${filtered.length} 条`}
          </span>
          <Input
            size="small"
            prefix={<SearchOutlined style={{ color: DARK.muted }} />}
            placeholder="搜索用户/履约/用途"
            style={{ width: 200, background: DARK.bg, borderColor: DARK.border, color: DARK.text }}
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            allowClear
          />
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
        >
          新建占用记录
        </Button>
      </div>

      <div style={{ padding: '16px 24px' }}>
        <FreqPlanView
          transponders={transponders}
          items={allOccs}
          onEdit={(id) => {
            const record = allOccs.find((o) => o.id === id);
            if (record) openEdit(record);
          }}
          onDelete={(id) => handleDelete(id)}
        />

        <div style={{ marginTop: 16 }} />

        <Table<OccupationRecordFull>
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

      <OccupationRecordForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          reload();
          message.success(editRecord ? '占用记录已更新' : '占用记录已新建');
        }}
        editRecord={editRecord}
        transponders={transponders}
        planningBlocks={planningBlocks}
      />
    </div>
  );
}
