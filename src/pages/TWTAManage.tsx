import { useEffect, useState } from 'react';
import { Table, Switch, Radio, InputNumber, Tag, Empty, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useStore } from '@/store/useStore';
import { fetchTwts, updateTwt } from '@/api';
import type { Twt } from '@/types';

const MUTED_VALUES = ['Muting', 'MUTING', 'ON', '静噪'];
const isMuted = (v: string | null) => !!v && MUTED_VALUES.includes(v);
const isOn = (v: string | null) => (v ?? '').toUpperCase() === 'ON';

export default function TWTAManage() {
  const { selectedSatelliteId } = useStore();
  const [rows, setRows] = useState<Twt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSatelliteId) return;
    setLoading(true);
    fetchTwts(selectedSatelliteId)
      .then(setRows)
      .catch((e) => { console.error(e); message.error('加载 TWT 数据失败'); })
      .finally(() => setLoading(false));
  }, [selectedSatelliteId]);

  // 乐观更新本地状态 + 持久化到后端
  function patch(id: number, data: Partial<Twt>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    updateTwt(id, data).catch((e) => {
      console.error(e);
      message.error('保存失败，已回滚');
      // 失败回滚：重新拉取
      if (selectedSatelliteId) fetchTwts(selectedSatelliteId).then(setRows).catch(console.error);
    });
  }

  const columns: ColumnsType<Twt> = [
    {
      title: 'TWT 编号', dataIndex: 'twtCodeShort', key: 'twtCodeShort', width: 120,
      render: (v) => <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{v ?? '—'}</span>,
    },
    {
      title: '长代码', dataIndex: 'twtCodeLong', key: 'twtCodeLong', width: 160,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{v ?? '—'}</span>,
    },
    {
      title: '单机代号', dataIndex: 'unitCode', key: 'unitCode', width: 110,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
      title: '开机 (ON/OFF)', key: 'onOff', width: 130,
      render: (_, r) => (
        <Switch
          checked={isOn(r.onOff)}
          onChange={(v) => patch(r.id, { onOff: v ? 'ON' : 'OFF' })}
          checkedChildren="ON"
          unCheckedChildren="OFF"
          size="small"
        />
      ),
    },
    {
      title: '静噪', key: 'muting', width: 120,
      render: (_, r) => (
        <Switch
          checked={isMuted(r.mutingStatus)}
          onChange={(v) => patch(r.id, { mutingStatus: v ? 'Muting' : 'Normal' })}
          checkedChildren="静噪开"
          unCheckedChildren="静噪关"
          size="small"
          style={{ background: isMuted(r.mutingStatus) ? '#ef4444' : undefined }}
        />
      ),
    },
    {
      title: '档位', key: 'gainLevel', width: 110,
      render: (_, r) => (
        <InputNumber
          value={r.gainLevel}
          min={0}
          max={25}
          disabled={isMuted(r.mutingStatus)}
          onChange={(v) => patch(r.id, { gainLevel: v as number })}
          size="small"
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: '工作模式', key: 'gainMode', width: 160,
      render: (_, r) => (
        <Radio.Group
          value={r.gainMode === 'ALC' ? 'ALC' : r.gainMode === 'FGM' ? 'FGM' : undefined}
          onChange={(e) => patch(r.id, { gainMode: e.target.value })}
          size="small"
          disabled={isMuted(r.mutingStatus)}
        >
          <Radio.Button value="FGM">FGM</Radio.Button>
          <Radio.Button value="ALC">ALC</Radio.Button>
        </Radio.Group>
      ),
    },
    {
      title: '状态', key: 'status', width: 100,
      render: (_, r) =>
        isMuted(r.mutingStatus)
          ? <Tag color="red">静噪中</Tag>
          : isOn(r.onOff)
            ? <Tag color="green">运行中</Tag>
            : <Tag color="default">待机</Tag>,
    },
  ];

  const total = rows.length;
  const onCount = rows.filter((r) => isOn(r.onOff)).length;
  const mutedCount = rows.filter((r) => isMuted(r.mutingStatus)).length;
  const fgmCount = rows.filter((r) => r.gainMode === 'FGM').length;

  const stat = (label: string, value: number | string, color: string) => (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
      padding: '12px 20px', display: 'flex', gap: 16, alignItems: 'center',
    }}>
      <span style={{ color: '#64748b', fontSize: 13 }}>{label}</span>
      <span style={{ color, fontWeight: 700, fontSize: 20, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        测控操作
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 16px' }}>
        行波管状态管理
      </h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {stat('总数', total, '#e2e8f0')}
        {stat('开机中', onCount, '#22c55e')}
        {stat('静噪中', mutedCount, '#ef4444')}
        {stat('FGM 模式', fgmCount, '#3b82f6')}
      </div>

      <Table
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: <Empty description="该卫星暂无行波管数据" /> }}
        pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 支行波管` }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
