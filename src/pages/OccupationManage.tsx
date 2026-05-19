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
import { useStore } from '@/store/useStore';
import {
  queryTransponders, queryAllOccupations, deleteOccupation,
} from '@/db/queries';
import type { OccupationFull } from '@/db/queries';
import type { Transponder, Occupation } from '@/types';
import type { FilterValues } from '@/components/FilterBar';

const DARK = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  muted: '#64748b',
};

const STATUS_COLOR: Record<string, string> = { 占用: 'blue', 空闲: 'default', 干扰: 'error' };

function msToStr(ms: number | null): string {
  if (ms == null) return '—';
  const d = new Date(ms);
  return d.toLocaleString('zh-CN', { hour12: false });
}

export default function OccupationManage() {
  const navigate = useNavigate();
  const { db, role, selectedSatelliteId } = useStore();

  const [transponders, setTransponders] = useState<Transponder[]>([]);
  const [allOccs, setAllOccs]           = useState<OccupationFull[]>([]);

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
      label: `${t.transponderName}（${t.band}${t.polarization ? ' ' + t.polarization : ''}）`,
    })),
    [transponders],
  );

  // Modal
  const [formOpen, setFormOpen]           = useState(false);
  const [editRecord, setEditRecord]       = useState<Occupation | null>(null);
  const [initTransponder, setInitTransponder] = useState<Transponder | null>(null);

  // 权限守卫
  useEffect(() => {
    if (role === null) navigate('/', { replace: true });
  }, [role, navigate]);

  // 加载数据
  const reload = useCallback(() => {
    if (!db || !selectedSatelliteId) return;
    setTransponders(queryTransponders(db, selectedSatelliteId));
    setAllOccs(queryAllOccupations(db, selectedSatelliteId));
  }, [db, selectedSatelliteId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // 前端筛选（转发器 / 频段 / 极化 / 开关状态 / 占用状态）
  const filtered = useMemo(() => {
    return allOccs.filter((o) => {
      if (filters.transponderSwitchId !== undefined && o.switchId !== filters.transponderSwitchId) return false;
      if (filters.band         && o.band !== filters.band)                                         return false;
      if (filters.polarization && o.polarization !== filters.polarization)                         return false;
      if (filters.switchStatus !== undefined && o.switchStatus !== filters.switchStatus)           return false;
      if (filters.occStatus    && o.occupationStatus !== filters.occStatus)                        return false;
      return true;
    });
  }, [allOccs, filters]);

  function openCreate(tp?: Transponder) {
    setEditRecord(null);
    setInitTransponder(tp ?? null);
    setFormOpen(true);
  }

  function openEdit(record: OccupationFull) {
    // OccupationFull satisfies Occupation (has all base fields)
    const base: Occupation = {
      id: record.id,
      frequencyBlockCode: record.frequencyBlockCode,
      switchId: record.switchId,
      switchCode: record.switchCode,
      occupiedBandwidth: record.occupiedBandwidth,
      frequencyOffset: record.frequencyOffset,
      occupationStatus: record.occupationStatus as Occupation['occupationStatus'],
      occupationStartTimeMs: record.occupationStartTimeMs,
      occupationEndTimeMs:   record.occupationEndTimeMs,
    };
    setEditRecord(base);
    setInitTransponder(null);
    setFormOpen(true);
  }

  function handleDelete(id: number) {
    if (!db) return;
    deleteOccupation(db, id);
    message.success('已删除');
    reload();
  }

  const columns: ColumnsType<OccupationFull> = [
    {
      title: '转发器',
      dataIndex: 'transponderName',
      width: 80,
      render: (v) => <span style={{ color: DARK.text, fontWeight: 500 }}>{v}</span>,
      sorter: (a, b) => a.transponderName.localeCompare(b.transponderName),
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
      width: 60,
      render: (v) => v ?? '—',
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
        r.rxActualStartFreq != null
          ? `${r.rxActualStartFreq.toFixed(2)} ~ ${r.rxActualEndFreq.toFixed(2)} MHz`
          : '—'
      ),
    },
    {
      title: '下行频率段',
      width: 170,
      render: (_, r) => (
        r.txActualStartFreq != null
          ? `${r.txActualStartFreq.toFixed(2)} ~ ${r.txActualEndFreq.toFixed(2)} MHz`
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
      dataIndex: 'occupationStatus',
      width: 70,
      render: (v) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
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
      title: '开始时间',
      dataIndex: 'occupationStartTimeMs',
      width: 150,
      render: msToStr,
    },
    {
      title: '结束时间',
      dataIndex: 'occupationEndTimeMs',
      width: 150,
      render: (v) => (v == null ? <span style={{ color: DARK.muted }}>长期</span> : msToStr(v)),
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
        <Table<OccupationFull>
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          scroll={{ x: 1300 }}
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
