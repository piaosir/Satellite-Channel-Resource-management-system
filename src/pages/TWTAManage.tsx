import { useState } from 'react';
import { Table, Switch, Select, Radio, Button, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface TWTARow {
  id: string;
  twtaNo: string;
  channel: string;
  muted: boolean;
  level: number;
  mode: 'FGM' | 'ALC';
  backupActive: boolean;
}

const INIT_DATA: TWTARow[] = [
  { id: '1', twtaNo: 'TWTA-01', channel: 'TP01-H', muted: false, level: 4, mode: 'ALC', backupActive: false },
  { id: '2', twtaNo: 'TWTA-02', channel: 'TP02-V', muted: false, level: 3, mode: 'FGM', backupActive: false },
  { id: '3', twtaNo: 'TWTA-03', channel: 'TP03-H', muted: true,  level: 0, mode: 'ALC', backupActive: false },
  { id: '4', twtaNo: 'TWTA-04', channel: 'TP04-V', muted: false, level: 6, mode: 'FGM', backupActive: true  },
  { id: '5', twtaNo: 'TWTA-05', channel: 'TP05-H', muted: false, level: 5, mode: 'ALC', backupActive: false },
  { id: '6', twtaNo: 'TWTA-06', channel: 'TP06-V', muted: false, level: 4, mode: 'ALC', backupActive: false },
  { id: '7', twtaNo: 'TWTA-07', channel: 'TP07-H', muted: true,  level: 0, mode: 'FGM', backupActive: false },
  { id: '8', twtaNo: 'TWTA-08', channel: 'TP08-V', muted: false, level: 7, mode: 'FGM', backupActive: false },
];

const LEVEL_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  value: i + 1,
  label: `档位 ${i + 1}`,
}));

export default function TWTAManage() {
  const [rows, setRows] = useState<TWTARow[]>(INIT_DATA);

  function updateRow(id: string, patch: Partial<TWTARow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleMuteToggle(id: string, checked: boolean) {
    updateRow(id, { muted: checked, level: checked ? 0 : 4 });
    message.info(`TWTA ${id} 静噪已${checked ? '开启' : '关闭'}`);
  }

  function handleBackupSwitch(id: string) {
    updateRow(id, { backupActive: true });
    message.success(`TWTA ${id} 已切换至备份机`);
  }

  const columns: ColumnsType<TWTARow> = [
    {
      title: '行波管编号', dataIndex: 'twtaNo', key: 'twtaNo', width: 130,
      render: (v) => <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{v}</span>,
    },
    { title: '关联通道', dataIndex: 'channel', key: 'channel', width: 120 },
    {
      title: '静噪', key: 'muted', width: 110,
      render: (_, r) => (
        <Switch
          checked={r.muted}
          onChange={(v) => handleMuteToggle(r.id, v)}
          checkedChildren="静噪开"
          unCheckedChildren="静噪关"
          size="small"
          style={{ background: r.muted ? '#ef4444' : undefined }}
        />
      ),
    },
    {
      title: '档位', key: 'level', width: 130,
      render: (_, r) => (
        <Select
          value={r.muted ? 0 : r.level}
          disabled={r.muted}
          onChange={(v) => updateRow(r.id, { level: v })}
          options={r.muted ? [{ value: 0, label: '—（静噪）' }] : LEVEL_OPTIONS}
          size="small"
          style={{ width: 110 }}
        />
      ),
    },
    {
      title: '工作模式', key: 'mode', width: 160,
      render: (_, r) => (
        <Radio.Group
          value={r.mode}
          onChange={(e) => updateRow(r.id, { mode: e.target.value })}
          size="small"
          disabled={r.muted}
        >
          <Radio.Button value="FGM">FGM</Radio.Button>
          <Radio.Button value="ALC">ALC</Radio.Button>
        </Radio.Group>
      ),
    },
    {
      title: '备份状态', key: 'backup', width: 120,
      render: (_, r) => (
        r.backupActive
          ? <Tag color="orange">备份运行中</Tag>
          : <Tag color="default">主机运行</Tag>
      ),
    },
    {
      title: '备份切换', key: 'action', width: 120,
      render: (_, r) => (
        <Button
          size="small"
          danger={r.backupActive}
          disabled={r.backupActive}
          onClick={() => handleBackupSwitch(r.id)}
          style={r.backupActive ? undefined : { borderColor: '#f59e0b', color: '#f59e0b' }}
        >
          {r.backupActive ? '已切换' : '切至备份'}
        </Button>
      ),
    },
  ];

  const mutedCount = rows.filter((r) => r.muted).length;
  const backupCount = rows.filter((r) => r.backupActive).length;

  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        测控操作
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 16px' }}>
        行波管状态管理
      </h1>

      {/* 状态摘要 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '12px 20px',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#64748b', fontSize: 13 }}>总数</span>
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 20, fontFamily: 'monospace' }}>{rows.length}</span>
        </div>
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '12px 20px',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#64748b', fontSize: 13 }}>静噪中</span>
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 20, fontFamily: 'monospace' }}>{mutedCount}</span>
        </div>
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '12px 20px',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#64748b', fontSize: 13 }}>备份运行</span>
          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 20, fontFamily: 'monospace' }}>{backupCount}</span>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={rows}
        rowKey="id"
        pagination={false}
        scroll={{ x: 900 }}
      />
    </div>
  );
}
