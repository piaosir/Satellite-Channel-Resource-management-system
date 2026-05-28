import { useState } from 'react';
import { Table, Tag, Input, Button, Space, DatePicker } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;

interface UsageRecord {
  id: string;
  recordNo: string;
  channelName: string;
  usageType: string;
  startTime: string;
  endTime: string;
  bandwidth: number;
  status: 'running' | 'finished' | 'abnormal';
}

const MOCK_DATA: UsageRecord[] = [
  { id: '1', recordNo: 'USE-2024-0001', channelName: 'TP01-H', usageType: '出租', startTime: '2024-01-15 08:00', endTime: '2025-01-14 08:00', bandwidth: 36, status: 'running' },
  { id: '2', recordNo: 'USE-2024-0002', channelName: 'TP02-V', usageType: '合作', startTime: '2024-02-01 00:00', endTime: '2024-12-31 23:59', bandwidth: 18, status: 'running' },
  { id: '3', recordNo: 'USE-2023-0087', channelName: 'TP03-H', usageType: '自用', startTime: '2023-07-01 00:00', endTime: '2024-06-30 23:59', bandwidth: 54, status: 'finished' },
  { id: '4', recordNo: 'USE-2024-0015', channelName: 'TP05-V', usageType: '出租', startTime: '2024-05-20 10:00', endTime: '2026-05-19 10:00', bandwidth: 72, status: 'running' },
  { id: '5', recordNo: 'USE-2024-0023', channelName: 'TP07-H', usageType: '合作', startTime: '2024-08-01 00:00', endTime: '2025-07-31 23:59', bandwidth: 36, status: 'abnormal' },
  { id: '6', recordNo: 'USE-2024-0031', channelName: 'TP09-V', usageType: '自用', startTime: '2024-09-15 09:00', endTime: '2025-09-14 09:00', bandwidth: 27, status: 'running' },
];

const statusMap: Record<UsageRecord['status'], { label: string; color: string }> = {
  running:  { label: '运行中', color: 'green' },
  finished: { label: '已结束', color: 'default' },
  abnormal: { label: '异常', color: 'red' },
};

const usageTypeColor: Record<string, string> = {
  '出租': 'blue',
  '合作': 'cyan',
  '自用': 'purple',
  '禁用': 'red',
};

const columns: ColumnsType<UsageRecord> = [
  { title: '记录编号', dataIndex: 'recordNo', key: 'recordNo', width: 160, render: (v) => <span style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{v}</span> },
  { title: '通道名称', dataIndex: 'channelName', key: 'channelName', width: 120 },
  {
    title: '使用类型', dataIndex: 'usageType', key: 'usageType', width: 100,
    render: (v: string) => <Tag color={usageTypeColor[v] ?? 'default'}>{v}</Tag>,
  },
  { title: '开始时间', dataIndex: 'startTime', key: 'startTime', width: 160, render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
  { title: '结束时间', dataIndex: 'endTime', key: 'endTime', width: 160, render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
  { title: '带宽 (MHz)', dataIndex: 'bandwidth', key: 'bandwidth', width: 110, align: 'right', render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
  {
    title: '状态', dataIndex: 'status', key: 'status', width: 100,
    render: (v: UsageRecord['status']) => <Tag color={statusMap[v].color}>{statusMap[v].label}</Tag>,
  },
  {
    title: '操作', key: 'action', width: 100,
    render: () => (
      <Space size="small">
        <Button size="small" type="text" style={{ color: '#3b82f6' }}>详情</Button>
      </Space>
    ),
  },
];

export default function UsageRecords() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_DATA.filter(
    (r) => r.recordNo.includes(search) || r.channelName.includes(search),
  );

  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        运营管理
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 24px' }}>
        使用记录管理
      </h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <RangePicker style={{ width: 280 }} />
        <Input
          prefix={<SearchOutlined style={{ color: '#475569' }} />}
          placeholder="搜索记录编号、通道名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Button type="primary" style={{ background: '#2563eb', borderColor: '#2563eb' }}>
          查询
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
