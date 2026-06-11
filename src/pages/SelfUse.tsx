/**
 * 自用载波 — 自有业务系统 → 载波 → 使用带宽过程记录
 * 与合约交付对称:使用记录同样引用通道分配状态的频率块代码。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Tag, Select, Space, Empty, Statistic, Row, Col, Typography,
} from 'antd';
import { useStore } from '@/store/useStore';
import {
  fetchBusinessSystems, fetchCarriers, fetchCarrierUsageRecords, fetchSatellites,
} from '@/api';
import type { BusinessSystem, Carrier, CarrierUsageRecord, Satellite } from '@/types';

const cardStyle = { background: '#0c1a2e', border: '1px solid #1e3a5f' };

export default function SelfUse() {
  const { dataVersion } = useStore();
  const [systems, setSystems] = useState<BusinessSystem[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [records, setRecords] = useState<CarrierUsageRecord[]>([]);
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [satFilter, setSatFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchBusinessSystems(),
      fetchCarriers(),
      fetchCarrierUsageRecords({ satellite: satFilter }),
      fetchSatellites(),
    ])
      .then(([ss, cs, rs, sats]) => {
        setSystems(ss); setCarriers(cs); setRecords(rs); setSatellites(sats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [satFilter, dataVersion]);

  const totalBw = useMemo(() => records
    .reduce((s, r) => s + (r.action === '占用' ? (r.bandwidth ?? 0) : -(r.bandwidth ?? 0)), 0),
  [records]);

  const satsInRecords = useMemo(
    () => [...new Set(records.map((r) => r.satelliteCode).filter(Boolean))] as string[],
    [records]);

  const cols = [
    { title: 'ID', dataIndex: 'id', width: 64 },
    {
      title: '动作', dataIndex: 'action', width: 64,
      render: (v: string) => <Tag color={v === '占用' ? 'cyan' : 'default'}>{v}</Tag>,
    },
    { title: '卫星', dataIndex: 'satelliteCode', width: 80 },
    { title: '带宽(MHz)', dataIndex: 'bandwidth', width: 92, align: 'right' as const },
    {
      title: '频率块代码', dataIndex: 'blockCode', ellipsis: true,
      render: (v: string) => (
        <Typography.Text copyable style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</Typography.Text>
      ),
    },
    { title: '独占/共享', dataIndex: 'exclusiveType', width: 86 },
    { title: '时间', dataIndex: 'actionTime', width: 150 },
    {
      title: '分配块', dataIndex: 'allocationIsValid', width: 90,
      render: (v: number | null, r: CarrierUsageRecord) =>
        r.allocationId
          ? <Tag color={v === 1 ? 'green' : 'red'}>#{r.allocationId}{v === 1 ? '' : ' 无效'}</Tag>
          : <Tag color="red">未关联</Tag>,
    },
  ];

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Row gutter={16}>
        <Col span={5}>
          <Card size="small" style={cardStyle}>
            <Statistic title="自有业务系统" value={systems.length}
              valueStyle={{ fontSize: 20 }} suffix={systems.length === 0 ? '(结构先行)' : ''} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={cardStyle}>
            <Statistic title="自有载波" value={carriers.length}
              valueStyle={{ fontSize: 20 }} suffix={carriers.length === 0 ? '(结构先行)' : ''} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={cardStyle}>
            <Statistic title="使用记录" value={records.length} valueStyle={{ fontSize: 20, color: '#06b6d4' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={cardStyle}>
            <Statistic title="自用净占用带宽" value={totalBw.toFixed(1)} suffix="MHz"
              valueStyle={{ fontSize: 20, color: '#22c55e' }} />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={cardStyle}>
        <Space wrap>
          <Select allowClear placeholder="按卫星筛选" style={{ width: 200 }}
            value={satFilter} onChange={setSatFilter}
            options={[...new Set([...satsInRecords, ...satellites.map((s) => s.satelliteCode)])]
              .map((c) => ({ value: c, label: c }))} />
          <span style={{ color: '#4a6a8a', fontSize: 12 }}>
            自用占用同样引用通道分配状态中的频率块代码;在「频率分配」页的块详情中可登记自用占用/释放
          </span>
        </Space>
      </Card>

      <Card size="small" style={cardStyle} title="载波使用带宽过程记录">
        {records.length === 0 && !loading
          ? <Empty description="暂无使用记录" />
          : (
            <Table<CarrierUsageRecord>
              size="small" rowKey="id" loading={loading}
              columns={cols} dataSource={records}
              pagination={{ pageSize: 30, size: 'small', showTotal: (t) => `共 ${t} 条` }}
            />
          )}
      </Card>
    </div>
  );
}
