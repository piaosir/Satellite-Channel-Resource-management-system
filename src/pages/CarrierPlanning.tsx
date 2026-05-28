import { useState } from 'react';
import { Table, Tag, Button, Progress, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface PlanRecord {
  id: string;
  planName: string;
  satellite: string;
  band: string;
  targetBw: number;
  allocatedBw: number;
  status: 'draft' | 'approved' | 'executing' | 'completed';
  updatedAt: string;
}

const MOCK_DATA: PlanRecord[] = [
  { id: '1', planName: '2025年Ku频段扩容规划', satellite: '亚太6D', band: 'Ku', targetBw: 500, allocatedBw: 320, status: 'executing', updatedAt: '2025-03-15' },
  { id: '2', planName: 'C频段载波优化方案', satellite: '中星9B', band: 'C', targetBw: 200, allocatedBw: 200, status: 'completed', updatedAt: '2024-12-01' },
  { id: '3', planName: 'EKu高轨道备份规划', satellite: '亚太6D', band: 'EKu', targetBw: 150, allocatedBw: 60, status: 'approved', updatedAt: '2025-04-20' },
  { id: '4', planName: '2026年战略储备载波', satellite: '天通一号', band: 'Ku', targetBw: 800, allocatedBw: 0, status: 'draft', updatedAt: '2025-05-10' },
];

const statusMap: Record<PlanRecord['status'], { label: string; color: string }> = {
  draft:     { label: '草稿', color: 'default' },
  approved:  { label: '已审批', color: 'blue' },
  executing: { label: '执行中', color: 'green' },
  completed: { label: '已完成', color: 'purple' },
};

const columns: ColumnsType<PlanRecord> = [
  { title: '规划名称', dataIndex: 'planName', key: 'planName', width: 220 },
  { title: '卫星', dataIndex: 'satellite', key: 'satellite', width: 120 },
  { title: '频段', dataIndex: 'band', key: 'band', width: 80 },
  {
    title: '目标带宽 (MHz)', dataIndex: 'targetBw', key: 'targetBw', width: 130, align: 'right',
    render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
  },
  {
    title: '分配进度', key: 'progress', width: 200,
    render: (_, r) => {
      const pct = r.targetBw > 0 ? Math.round((r.allocatedBw / r.targetBw) * 100) : 0;
      return (
        <div>
          <Progress
            percent={pct}
            size="small"
            strokeColor={pct >= 100 ? '#8b5cf6' : '#3b82f6'}
            trailColor="#1e3a5f"
            format={(p) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{p}%</span>}
          />
          <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
            {r.allocatedBw} / {r.targetBw} MHz
          </div>
        </div>
      );
    },
  },
  {
    title: '状态', dataIndex: 'status', key: 'status', width: 100,
    render: (v: PlanRecord['status']) => <Tag color={statusMap[v].color}>{statusMap[v].label}</Tag>,
  },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 120, render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
  {
    title: '操作', key: 'action', width: 130,
    render: () => (
      <Space size="small">
        <Button size="small" type="text" style={{ color: '#3b82f6' }}>详情</Button>
        <Button size="small" type="text" style={{ color: '#64748b' }}>编辑</Button>
      </Space>
    ),
  },
];

export default function CarrierPlanning() {
  const [data] = useState(MOCK_DATA);

  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        资源规划
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 24px' }}>
        资源 / 载波规划管理
      </h1>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: '#2563eb', borderColor: '#2563eb' }}
        >
          新建规划
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条规划` }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
