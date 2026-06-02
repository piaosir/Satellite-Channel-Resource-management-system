import { useEffect, useMemo, useState } from 'react';
import { Table, Tag, Input, Select, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { fetchProductInstances } from '@/api';
import type { ProductInstance } from '@/types';

const fmtDate = (s: string | null) => (s ? s.slice(0, 10) : '—');
const fmtMoney = (v: number | null) =>
  v == null ? '—' : `¥${Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;

const groupColor: Record<string, string> = {
  广电组: 'blue',
  行业市场组: 'cyan',
  政府军队组: 'red',
  国际组: 'gold',
};

const fulfillColor: Record<string, string> = {
  履约中: 'green',
  未履约: 'orange',
};

const columns: ColumnsType<ProductInstance> = [
  {
    title: '商品实例编号', dataIndex: 'productInstanceCode', key: 'productInstanceCode', width: 250, ellipsis: true,
    render: (v: string | null) =>
      v ? (
        <Tooltip title={v}>
          <span style={{ fontFamily: 'monospace', color: '#93c5fd', fontSize: 12 }}>{v}</span>
        </Tooltip>
      ) : '—',
  },
  { title: '甲方', dataIndex: 'partyA', key: 'partyA', width: 190, ellipsis: true },
  { title: '商品名称', dataIndex: 'productName', key: 'productName', width: 160, ellipsis: true },
  {
    title: '分组', dataIndex: 'groupName', key: 'groupName', width: 120,
    render: (v: string | null) => (v ? <Tag color={groupColor[v] ?? 'default'}>{v}</Tag> : '—'),
  },
  { title: '销售', dataIndex: 'sales', key: 'sales', width: 90 },
  {
    title: '带宽 (MHz)', dataIndex: 'bandwidthMHz', key: 'bandwidthMHz', width: 100, align: 'right',
    render: (v) => <span style={{ fontFamily: 'monospace' }}>{v ?? '—'}</span>,
  },
  {
    title: '子订单金额', dataIndex: 'subOrderAmount', key: 'subOrderAmount', width: 130, align: 'right',
    render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtMoney(v)}</span>,
  },
  {
    title: '履约状态', dataIndex: 'fulfillStatus', key: 'fulfillStatus', width: 100,
    render: (v: string | null) => (v ? <Tag color={fulfillColor[v] ?? 'default'}>{v}</Tag> : <Tag>未填报</Tag>),
  },
  {
    title: '合约期', key: 'period', width: 190,
    render: (_, r) => (
      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
        {fmtDate(r.planStartTime)} ~ {fmtDate(r.planEndTime)}
      </span>
    ),
  },
];

export default function UsageRecords() {
  const [data, setData] = useState<ProductInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchProductInstances()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(
    () => [...new Set(data.map((d) => d.groupName).filter(Boolean))] as string[],
    [data],
  );

  const filtered = data.filter((r) => {
    if (groupFilter && r.groupName !== groupFilter) return false;
    if (statusFilter && r.fulfillStatus !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.productInstanceCode ?? '').toLowerCase().includes(s) ||
      (r.partyA ?? '').toLowerCase().includes(s) ||
      (r.contractNo ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        运营管理
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 24px' }}>
        使用记录管理
      </h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#475569' }} />}
          placeholder="搜索商品实例编号、甲方、合同号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 320 }}
          allowClear
        />
        <Select
          placeholder="按分组" allowClear style={{ width: 140 }} value={groupFilter}
          onChange={(v) => setGroupFilter(v ?? null)}
          options={groups.map((g) => ({ value: g, label: g }))}
        />
        <Select
          placeholder="履约状态" allowClear style={{ width: 130 }} value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? null)}
          options={[{ value: '履约中', label: '履约中' }, { value: '未履约', label: '未履约' }]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 12, showTotal: (t) => `共 ${t} 条记录` }}
        scroll={{ x: 1300 }}
      />
    </div>
  );
}
