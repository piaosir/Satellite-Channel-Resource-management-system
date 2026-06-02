import { useEffect, useState } from 'react';
import { Table, Switch, Tag, Select, Tabs, message } from 'antd';
import { useStore } from '@/store/useStore';
import { fetchTransponders, fetchChannelAttributes, fetchSwitchGroups } from '@/api';
import type { Transponder, SwitchGroup } from '@/types';
import type { ColumnsType } from 'antd/es/table';
import { fmtFreq } from '@/utils/freqCalc';

interface ChannelRow extends Transponder {
  localStatus: number;
  gainMode?: string | null;
  currentLevel?: number | null;
  currentSfd?: string | null;
}

interface GroupRow {
  key: string;
  switchGroupCode: string;
  matrixCode: string | null;
  switchType: string | null;
  memberCount: number;
  channels: string;
  onCount: number;
}

// 按开关组代码聚合，计算成员数与置通数（互斥校验）
function aggregateGroups(list: SwitchGroup[]): GroupRow[] {
  const map = new Map<string, SwitchGroup[]>();
  for (const g of list) {
    const code = g.switchGroupCode ?? '(未命名)';
    const arr = map.get(code);
    if (arr) arr.push(g);
    else map.set(code, [g]);
  }
  return [...map.entries()].map(([code, members]) => ({
    key: code,
    switchGroupCode: code,
    matrixCode: members[0]?.matrixCode ?? null,
    switchType: members[0]?.switchType ?? null,
    memberCount: members.length,
    channels: members.map((m) => m.inputChannelShortName).filter(Boolean).join(', '),
    onCount: members.filter((m) => m.switchStatus === 1).length,
  }));
}

// ─── Tab 1：通道增益 ──────────────────────────────────────────
function GainTab() {
  const { selectedSatelliteId } = useStore();
  const [rows, setRows] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bandFilter, setBandFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSatelliteId) return;
    setLoading(true);
    Promise.all([
      fetchTransponders(selectedSatelliteId),
      fetchChannelAttributes(selectedSatelliteId),
    ])
      .then(([trans, attrs]) => {
        const bySwitch = new Map(attrs.map((a) => [a.switchCode, a]));
        setRows(
          trans.map((t) => {
            const a = bySwitch.get(t.switchCode);
            return {
              ...t,
              localStatus: t.switchStatus,
              gainMode: a?.gainMode ?? null,
              currentLevel: a?.currentLevel ?? null,
              currentSfd: a?.currentSfd ?? null,
            };
          }),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSatelliteId]);

  function handleToggle(switchId: number, checked: boolean) {
    setRows((prev) =>
      prev.map((r) => (r.switchId === switchId ? { ...r, localStatus: checked ? 1 : 0 } : r)),
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
      title: '通道名称', dataIndex: 'transponderName', key: 'transponderName', width: 150,
      render: (v) => <span style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{v}</span>,
    },
    { title: '频段', dataIndex: 'band', key: 'band', width: 70 },
    { title: '极化', dataIndex: 'polarization', key: 'polarization', width: 70 },
    {
      title: '上行频率 (MHz)', key: 'rxFreq', width: 180,
      render: (_, r) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {fmtFreq(r.rxStartFreq)} ~ {fmtFreq(r.rxEndFreq)}
        </span>
      ),
    },
    {
      title: '带宽', dataIndex: 'channelBw', key: 'channelBw', width: 80, align: 'right',
      render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: '增益模式', dataIndex: 'gainMode', key: 'gainMode', width: 100,
      render: (v) => v ? <Tag color={v === 'ALC' ? 'purple' : 'blue'}>{v}</Tag> : <span style={{ color: '#475569' }}>—</span>,
    },
    {
      title: '当前档位', dataIndex: 'currentLevel', key: 'currentLevel', width: 90, align: 'right',
      render: (v) => <span style={{ fontFamily: 'monospace' }}>{v ?? '—'}</span>,
    },
    {
      title: 'SFD (dBW/m²)', dataIndex: 'currentSfd', key: 'currentSfd', width: 130,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#cbd5e1' }}>{v ?? '—'}</span>,
    },
    {
      title: '开关状态', key: 'switchStatus', width: 100,
      render: (_, r) => (
        <Tag color={r.localStatus === 1 ? 'green' : 'default'}>{r.localStatus === 1 ? '开' : '关'}</Tag>
      ),
    },
    {
      title: '操作', key: 'action', width: 90, fixed: 'right',
      render: (_, r) => (
        <Switch
          checked={r.localStatus === 1}
          onChange={(checked) => handleToggle(r.switchId, checked)}
          checkedChildren="开" unCheckedChildren="关" size="small"
        />
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          placeholder="按频段筛选" allowClear style={{ width: 140 }} value={bandFilter}
          onChange={(v) => setBandFilter(v ?? null)}
          options={bands.map((b) => ({ value: b, label: b }))}
        />
        <Select
          placeholder="按开关状态" allowClear style={{ width: 140 }} value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? null)}
          options={[{ value: 'on', label: '开启' }, { value: 'off', label: '关闭' }]}
        />
      </div>
      <Table
        columns={columns} dataSource={filtered} rowKey="switchId" loading={loading}
        pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条通道` }}
        scroll={{ x: 1100 }}
      />
    </>
  );
}

// ─── Tab 2：开关组 ────────────────────────────────────────────
function SwitchGroupTab() {
  const { selectedSatelliteId } = useStore();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSatelliteId) return;
    setLoading(true);
    fetchSwitchGroups(selectedSatelliteId)
      .then((list) => setGroups(aggregateGroups(list)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSatelliteId]);

  const columns: ColumnsType<GroupRow> = [
    {
      title: '开关组代码', dataIndex: 'switchGroupCode', key: 'switchGroupCode', width: 180,
      render: (v) => <span style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{v}</span>,
    },
    { title: '所属矩阵', dataIndex: 'matrixCode', key: 'matrixCode', width: 130,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v ?? '—'}</span> },
    { title: '类型', dataIndex: 'switchType', key: 'switchType', width: 90,
      render: (v) => <Tag>{v ?? '—'}</Tag> },
    { title: '成员开关数', dataIndex: 'memberCount', key: 'memberCount', width: 110, align: 'right' },
    { title: '关联通道', dataIndex: 'channels', key: 'channels', width: 260,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#cbd5e1' }}>{v || '—'}</span> },
    {
      title: '置通数', dataIndex: 'onCount', key: 'onCount', width: 90, align: 'right',
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: v > 1 ? '#ef4444' : '#22c55e' }}>{v}</span>,
    },
    {
      title: '互斥校验', key: 'check', width: 130,
      render: (_, r) =>
        r.onCount > 1
          ? <Tag color="red">冲突·多路置通</Tag>
          : <Tag color="green">合规</Tag>,
    },
  ];

  const conflictCount = groups.filter((g) => g.onCount > 1).length;

  return (
    <>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
        模拟开关组规则：同组仅允许一路置通。共 <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{groups.length}</span> 组，
        冲突 <span style={{ color: conflictCount ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{conflictCount}</span> 组。
      </div>
      <Table
        columns={columns} dataSource={groups} rowKey="key" loading={loading}
        pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 个开关组` }}
        scroll={{ x: 1000 }}
      />
    </>
  );
}

export default function ChannelConfig() {
  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        测控操作
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 16px' }}>
        通道配置管理
      </h1>

      <Tabs
        defaultActiveKey="gain"
        items={[
          { key: 'gain', label: '通道增益 / SFD', children: <GainTab /> },
          { key: 'group', label: '开关组互斥校验', children: <SwitchGroupTab /> },
        ]}
      />
    </div>
  );
}
