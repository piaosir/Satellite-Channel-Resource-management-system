import { useState } from 'react';
import { Table, Tag, Input, Button, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Contract {
  id: string;
  contractNo: string;
  customer: string;
  satellite: string;
  band: string;
  bandwidth: number;
  period: string;
  status: 'active' | 'expired' | 'reviewing';
}

const MOCK_DATA: Contract[] = [
  { id: '1', contractNo: 'HT-2024-001', customer: '中国电信卫星', satellite: '亚太6D', band: 'Ku', bandwidth: 54, period: '2024-01 ~ 2025-12', status: 'active' },
  { id: '2', contractNo: 'HT-2024-002', customer: '国家广播电视总局', satellite: '中星9B', band: 'Ku', bandwidth: 36, period: '2024-03 ~ 2026-02', status: 'active' },
  { id: '3', contractNo: 'HT-2023-008', customer: '中国联通', satellite: '亚太6D', band: 'C', bandwidth: 72, period: '2023-06 ~ 2024-05', status: 'expired' },
  { id: '4', contractNo: 'HT-2024-015', customer: '中国移动卫星', satellite: '天通一号', band: 'Ku', bandwidth: 36, period: '2024-08 ~ 2026-07', status: 'reviewing' },
  { id: '5', contractNo: 'HT-2024-022', customer: '北京航天宏图', satellite: '中星9B', band: 'EKu', bandwidth: 18, period: '2024-09 ~ 2025-08', status: 'active' },
  { id: '6', contractNo: 'HT-2024-031', customer: '中国卫通集团', satellite: '亚太6D', band: 'Ku', bandwidth: 108, period: '2024-11 ~ 2027-10', status: 'reviewing' },
];

const statusMap: Record<Contract['status'], { label: string; color: string }> = {
  active:    { label: '生效中', color: 'green' },
  expired:   { label: '已到期', color: 'default' },
  reviewing: { label: '审核中', color: 'orange' },
};

const columns: ColumnsType<Contract> = [
  { title: '合约编号', dataIndex: 'contractNo', key: 'contractNo', width: 160, render: (v) => <span style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{v}</span> },
  { title: '客户名称', dataIndex: 'customer', key: 'customer', width: 180 },
  { title: '卫星', dataIndex: 'satellite', key: 'satellite', width: 120 },
  { title: '频段', dataIndex: 'band', key: 'band', width: 80 },
  { title: '带宽 (MHz)', dataIndex: 'bandwidth', key: 'bandwidth', width: 110, align: 'right', render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
  { title: '合约周期', dataIndex: 'period', key: 'period', width: 200 },
  {
    title: '状态', dataIndex: 'status', key: 'status', width: 100,
    render: (v: Contract['status']) => (
      <Tag color={statusMap[v].color}>{statusMap[v].label}</Tag>
    ),
  },
  {
    title: '操作', key: 'action', width: 120,
    render: () => (
      <Space size="small">
        <Button size="small" type="text" style={{ color: '#3b82f6' }}>查看</Button>
        <Button size="small" type="text" style={{ color: '#64748b' }}>编辑</Button>
      </Space>
    ),
  },
];

export default function ContractRecords() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_DATA.filter(
    (r) =>
      r.contractNo.includes(search) ||
      r.customer.includes(search) ||
      r.satellite.includes(search),
  );

  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        业务管理
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 24px' }}>
        合约记录管理
      </h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#475569' }} />}
          placeholder="搜索合约编号、客户、卫星..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <div style={{ flex: 1 }} />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: '#2563eb', borderColor: '#2563eb' }}
        >
          新建合约
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
        scroll={{ x: 1000 }}
        style={{ background: 'transparent' }}
      />
    </div>
  );
}
