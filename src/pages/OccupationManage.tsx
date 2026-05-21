import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Popconfirm,
  Tag, Badge, Tooltip, message, Input,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import FilterBar from '@/components/FilterBar';
import OccupationForm from '@/components/OccupationForm';
import { useStore } from '@/store/useStore';
import { fetchTransponders, fetchFrequencyBlocksBySatellite, deleteFrequencyBlock, updateChannelCommonName } from '@/api';
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

/** 状态展示辅助 */
function occStatusLabel(o: FrequencyBlock): string {
  if (o.usageType === '禁用') return '禁用';
  return o.partitionStatus === 'P' ? o.usageType ?? '划分' : '空闲';
}
function occStatusColor(o: FrequencyBlock): string {
  if (o.usageType === '禁用') return 'error';
  return o.partitionStatus === 'P' ? 'blue' : 'default';
}

export default function OccupationManage() {
  const navigate = useNavigate();
  const { role, selectedSatelliteId } = useStore();

  const [transponders, setTransponders] = useState<Transponder[]>([]);
  const [allOccs, setAllOccs]           = useState<FrequencyBlockFull[]>([]);

  // 统一筛选条件
  const [filters, setFilters] = useState<FilterValues>({});

  // 动态选项
  const availableBands = useMemo(
    () => [...new Set(transponders.map((t) => t.band).filter(Boolean))].sort() as string[],
    [transponders],
  );
  const availablePolarizations = useMemo(
    () => [...new Set(transponders.map((t) => t.polarization).filter(Boolean))].sort() as string[],
    [transponders],
  );
  const availableTransponders = useMemo(
    () => transponders.map((t) => ({
      switchId: t.switchId,
      label: fmtChannelLabel(t),
    })),
    [transponders],
  );

  // Modal
  const [formOpen, setFormOpen]           = useState(false);
  const [editRecord, setEditRecord]       = useState<FrequencyBlock | null>(null);
  const [initTransponder, setInitTransponder] = useState<Transponder | null>(null);

  // 通道名称内联编辑
  const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
  const [nameInput, setNameInput]               = useState('');
  const [savingName, setSavingName]             = useState(false);

  const canEditName = role != null && (role === 'delivery' || role === 'satellite_engineer');

  // 权限守卫
  useEffect(() => {
    if (role === null) navigate('/', { replace: true });
  }, [role, navigate]);

  // 加载数据
  const reload = useCallback(() => {
    if (!selectedSatelliteId) return;
    fetchTransponders(selectedSatelliteId).then(setTransponders).catch(console.error);
    fetchFrequencyBlocksBySatellite(selectedSatelliteId).then(setAllOccs).catch(console.error);
  }, [selectedSatelliteId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // 前端筛选（通道 / 频段 / 极化 / 开关状态 / 占用状态）
  const filtered = useMemo(() => {
    return allOccs.filter((o) => {
      if (filters.transponderSwitchId !== undefined && o.switchId !== filters.transponderSwitchId) return false;
      if (filters.band         && o.band !== filters.band)                                         return false;
      if (filters.polarization && o.polarization !== filters.polarization)                         return false;
      if (filters.switchStatus !== undefined && o.switchStatus !== filters.switchStatus)           return false;
      if (filters.occStatus    && o.partitionStatus !== filters.occStatus)                        return false;
      return true;
    });
  }, [allOccs, filters]);

  function openCreate(tp?: Transponder) {
    setEditRecord(null);
    setInitTransponder(tp ?? null);
    setFormOpen(true);
  }

  function openEdit(record: FrequencyBlockFull) {
    const base: FrequencyBlock = {
      id: record.id,
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
    message.success('已删除');
    reload();
  }

  async function handleSaveName(channelId: number) {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await updateChannelCommonName(channelId, nameInput.trim());
      message.success('通道名称已更新');
      setEditingChannelId(null);
      reload();
    } catch (e) {
      message.error((e as Error).message ?? '保存失败');
    } finally {
      setSavingName(false);
    }
  }

  const columns: ColumnsType<FrequencyBlockFull> = [
    {
      title: '通道',
      dataIndex: 'transponderName',
      width: 160,
      render: (_v, record) => {
        if (canEditName && editingChannelId === record.inputChannelId) {
          return (
            <Space size={4}>
              <Input
                size="small"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onPressEnter={() => handleSaveName(record.inputChannelId)}
                style={{ width: 110 }}
                autoFocus
              />
              <Button
                type="text" size="small" icon={<CheckOutlined />}
                style={{ color: '#4ade80' }}
                loading={savingName}
                onClick={() => handleSaveName(record.inputChannelId)}
              />
              <Button
                type="text" size="small" icon={<CloseOutlined />}
                style={{ color: '#94a3b8' }}
                onClick={() => setEditingChannelId(null)}
              />
            </Space>
          );
        }
        return (
          <Space size={4}>
            <span style={{ color: DARK.text, fontWeight: 500 }}>{fmtChannelLabel(record)}</span>
            {canEditName && (
              <Tooltip title="修改通道名称">
                <Button
                  type="text" size="small" icon={<EditOutlined />}
                  style={{ color: '#60a5fa' }}
                  onClick={() => { setEditingChannelId(record.inputChannelId); setNameInput(record.transponderName); }}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
      sorter: (a, b) => a.transponderName.localeCompare(b.transponderName),
    },
    {
      title: '上行频段',
      dataIndex: 'band',
      width: 75,
      render: (v) => (
        <Tag color={v === 'Ku' ? 'blue' : v === 'EKu' ? 'purple' : 'green'}>{v}</Tag>
      ),
    },
    {
      title: '上行极化',
      dataIndex: 'polarization',
      width: 80,
      render: (v) => fmtPolarization(v),
    },
    {
      title: '上行波束',
      dataIndex: 'antennaName',
      width: 110,
      render: (v) => v ?? <span style={{ color: DARK.muted }}>—</span>,
    },
    {
      title: '下行频段',
      dataIndex: 'txBand',
      width: 75,
      render: (v) => v
        ? <Tag color={v === 'Ku' ? 'blue' : v === 'EKu' ? 'purple' : 'green'}>{v}</Tag>
        : <span style={{ color: DARK.muted }}>—</span>,
    },
    {
      title: '下行极化',
      dataIndex: 'txPolarization',
      width: 80,
      render: (v) => fmtPolarization(v),
    },
    {
      title: '下行波束',
      dataIndex: 'txAntennaName',
      width: 110,
      render: (v) => v ?? <span style={{ color: DARK.muted }}>—</span>,
    },
    {
      title: '频率块代码',
      dataIndex: 'frequencyBlockCode',
      ellipsis: true,
      width: 140,
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
      title: '占用带宽',
      dataIndex: 'occupiedBandwidth',
      width: 80,
      render: (v) => `${v} MHz`,
    },
    {
      title: '状态',
      width: 80,
      render: (_, r) => <Tag color={occStatusColor(r)}>{occStatusLabel(r)}</Tag>,
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
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
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

  return (
    <div>
      {/* 统一筛选栏 */}
      <FilterBar
        onFilter={setFilters}
        availableTransponders={availableTransponders}
        availableBands={availableBands}
        availablePolarizations={availablePolarizations}
      />
      {/* 记录数 + 新建按钮 */}
      <div style={{
        padding: '8px 24px',
        background: DARK.card,
        borderBottom: `1px solid ${DARK.border}`,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ color: DARK.muted, fontSize: 13 }}>
          共 <b style={{ color: DARK.text }}>{allOccs.length}</b> 条
          {filtered.length !== allOccs.length && `，筛选后 ${filtered.length} 条`}
        </span>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openCreate()}
        >
          新建占用
        </Button>
      </div>

      {/* 表格 */}
      <div style={{ padding: '16px 24px' }}>
        <Table<FrequencyBlockFull>
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          scroll={{ x: 1700 }}
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

      {/* 新建/编辑表单 Modal */}
      <OccupationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => { reload(); message.success(editRecord ? '已更新' : '已新建'); }}
        editRecord={editRecord}
        transponders={transponders}
        initTransponder={initTransponder}
      />
    </div>
  );
}
