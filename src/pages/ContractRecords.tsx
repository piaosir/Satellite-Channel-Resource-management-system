import { useEffect, useMemo, useState } from 'react';
import { Table, Tag, Input, Select, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { fetchContracts } from '@/api';
import type { ContractRecord } from '@/types';

const fmtDate = (s: string | null) => (s ? s.slice(0, 10) : '—');

function exclusiveColor(v: string | null): string {
  if (!v) return 'default';
  if (v.includes('独占') || v.includes('独享')) return 'blue';
  if (v.includes('共享')) return 'cyan';
  if (v.includes('主')) return 'geekblue';
  return 'default';
}

const columns: ColumnsType<ContractRecord> = [
  {
    title: '甲方', dataIndex: 'partyA', key: 'partyA', width: 200, ellipsis: true,
    render: (v) => <span style={{ color: '#e2e8f0' }}>{v ?? '—'}</span>,
  },
  { title: '商品名称', dataIndex: 'productName', key: 'productName', width: 160, ellipsis: true },
  {
    title: '合同编号', dataIndex: 'contractNo', key: 'contractNo', width: 170,
    render: (v) => <span style={{ fontFamily: 'monospace', color: '#93c5fd', fontSize: 12 }}>{v ?? '—'}</span>,
  },
  { title: '卫星', dataIndex: 'satelliteCode', key: 'satelliteCode', width: 80 },
  {
    title: '频率块代码', dataIndex: 'frequencyBlockCode2', key: 'frequencyBlockCode2', width: 240, ellipsis: true,
    render: (v: string | null) =>
      v ? (
        <Tooltip title={v}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{v}</span>
        </Tooltip>
      ) : '—',
  },
  {
    title: '独占/共享', dataIndex: 'exclusiveType', key: 'exclusiveType', width: 110,
    render: (v: string | null) => (v ? <Tag color={exclusiveColor(v)}>{v}</Tag> : '—'),
  },
  {
    title: '带宽 (MHz)', dataIndex: 'usedBandwidth', key: 'usedBandwidth', width: 100, align: 'right',
    render: (v) => <span style={{ fontFamily: 'monospace' }}>{v ?? '—'}</span>,
  },
  {
    title: '合约周期', key: 'period', width: 190,
    render: (_, r) => (
      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
        {fmtDate(r.startTime)} ~ {fmtDate(r.endTime)}
      </span>
    ),
  },
  {
    title: '上行 (MHz)', key: 'uplink', width: 170,
    render: (_, r) => (
      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
        <span style={{ color: '#64748b' }}>{r.uplinkBeamCode ?? ''} {r.uplinkPolarization ?? ''}</span>{' '}
        {r.uplinkStartFreq ?? '—'}~{r.uplinkEndFreq ?? '—'}
      </span>
    ),
  },
  {
    title: '下行 (MHz)', key: 'downlink', width: 170,
    render: (_, r) => (
      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
        <span style={{ color: '#64748b' }}>{r.downlinkBeamCode ?? ''} {r.downlinkPolarization ?? ''}</span>{' '}
        {r.downlinkStartFreq ?? '—'}~{r.downlinkEndFreq ?? '—'}
      </span>
    ),
  },
];

export default function ContractRecords() {
  const [data, setData] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [satFilter, setSatFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchContracts()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const satellites = useMemo(
    () => [...new Set(data.map((d) => d.satelliteCode).filter(Boolean))] as string[],
    [data],
  );

  const filtered = data.filter((r) => {
    if (satFilter && r.satelliteCode !== satFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.partyA ?? '').toLowerCase().includes(s) ||
      (r.contractNo ?? '').toLowerCase().includes(s) ||
      (r.frequencyBlockCode2 ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        业务管理
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 24px' }}>
        合约记录管理
      </h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#475569' }} />}
          placeholder="搜索甲方、合同编号、频率块..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          placeholder="按卫星筛选"
          allowClear
          style={{ width: 140 }}
          value={satFilter}
          onChange={(v) => setSatFilter(v ?? null)}
          options={satellites.map((s) => ({ value: s, label: s }))}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 12, showTotal: (t) => `共 ${t} 条合约` }}
        scroll={{ x: 1500 }}
        style={{ background: 'transparent' }}
      />
    </div>
  );
}
