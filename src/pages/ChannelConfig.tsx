import { useEffect, useState } from 'react';
import { Table, Switch, Tag, Select, message } from 'antd';
import { useStore } from '@/store/useStore';
import { fetchTransponders } from '@/api';
import type { Transponder } from '@/types';
import type { ColumnsType } from 'antd/es/table';
import { fmtFreq } from '@/utils/freqCalc';

interface ChannelRow extends Transponder {
  localStatus: number;
}

export default function ChannelConfig() {
  const { selectedSatelliteId } = useStore();
  const [rows, setRows] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bandFilter, setBandFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSatelliteId) return;
    setLoading(true);
    fetchTransponders(selectedSatelliteId)
      .then((list) =>
        setRows(list.map((t) => ({ ...t, localStatus: t.switchStatus }))),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSatelliteId]);

  function handleToggle(switchId: number, checked: boolean) {
    setRows((prev) =>
      prev.map((r) =>
        r.switchId === switchId ? { ...r, localStatus: checked ? 1 : 0 } : r,
      ),
    );
    message.success(`通道开关已${checked ? '开启' : '关闭'}（DEMO 本地状态）`);
  }

  const bands = [...new Set(rows.map((r) => r.band).filter(Boolean))];

  const filtered = rows.filter((r) => {
    if (bandFilter && r.band !== bandFilter) return false;
    if (statusFilter === 'on' && r.localStatus !== 1) return false;
    if (statusFilter === 'off' && r.localStatus !== 0) return false;
    return true;
  });

  const columns: ColumnsType<ChannelRow> = [
    {
      title: '通道名称', dataIndex: 'transponderName', key: 'transponderName', width: 160,
      render: (v) => <span style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{v}</span>,
    },
    { title: '频段', dataIndex: 'band', key: 'band', width: 80 },
    { title: '极化', dataIndex: 'polarization', key: 'polarization', width: 80 },
    {
      title: '上行频率范围 (MHz)', key: 'rxFreq', width: 200,
      render: (_, r) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {fmtFreq(r.rxStartFreq)} ~ {fmtFreq(r.rxEndFreq)}
        </span>
      ),
    },
    {
      title: '下行频率范围 (MHz)', key: 'txFreq', width: 200,
      render: (_, r) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {fmtFreq(r.txStartFreq)} ~ {fmtFreq(r.txEndFreq)}
        </span>
      ),
    },
    {
      title: '带宽 (MHz)', dataIndex: 'channelBw', key: 'channelBw', width: 110, align: 'right',
      render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: '开关状态', key: 'switchStatus', width: 120,
      render: (_, r) => (
        <Tag color={r.localStatus === 1 ? 'green' : 'default'}>
          {r.localStatus === 1 ? '开' : '关'}
        </Tag>
      ),
    },
    {
      title: '操作', key: 'action', width: 100, fixed: 'right',
      render: (_, r) => (
        <Switch
          checked={r.localStatus === 1}
          onChange={(checked) => handleToggle(r.switchId, checked)}
          checkedChildren="开"
          unCheckedChildren="关"
          size="small"
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        测控操作
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 24px' }}>
        通道配置管理
      </h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Select
          placeholder="按频段筛选"
          allowClear
          style={{ width: 140 }}
          value={bandFilter}
          onChange={(v) => setBandFilter(v ?? null)}
          options={bands.map((b) => ({ value: b, label: b }))}
        />
        <Select
          placeholder="按开关状态"
          allowClear
          style={{ width: 140 }}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? null)}
          options={[
            { value: 'on', label: '开启' },
            { value: 'off', label: '关闭' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="switchId"
        loading={loading}
        pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条通道` }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
