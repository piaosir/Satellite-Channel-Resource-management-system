/**
 * 资源总览 — 当前卫星档案 + 频段带宽 + 规划用途分布 + 分配概况
 */
import { useEffect, useState } from 'react';
import { Card, Descriptions, Statistic, Row, Col, Tag, Spin, Empty, Progress, Tooltip } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useStore } from '@/store/useStore';
import { fetchSatelliteDetail, fetchBeacons, fetchStats } from '@/api';
import type { Satellite, Beacon, SatelliteStats } from '@/types';
import { USAGE_COLORS } from '@/utils/freq';

const cardStyle = { background: '#0c1a2e', border: '1px solid #1e3a5f' };

export default function Dashboard() {
  const { selectedSatelliteId, dataVersion } = useStore();
  const [sat, setSat] = useState<Satellite | null>(null);
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [stats, setStats] = useState<SatelliteStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSatelliteId) return;
    setLoading(true);
    Promise.all([
      fetchSatelliteDetail(selectedSatelliteId),
      fetchBeacons(selectedSatelliteId),
      fetchStats(selectedSatelliteId),
    ])
      .then(([s, b, st]) => { setSat(s); setBeacons(b); setStats(st); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSatelliteId, dataVersion]);

  if (!selectedSatelliteId) return <Empty style={{ marginTop: 80 }} description="请选择卫星" />;

  const bandOption = stats && {
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 30, bottom: 24 },
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#94a3b8', fontSize: 11 }, top: 0 },
    xAxis: {
      type: 'category',
      data: stats.byBand.map((b) => b.band),
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#2d4a6e' } },
    },
    yAxis: {
      type: 'value', name: 'MHz',
      nameTextStyle: { color: '#4a6a8a' },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#16263d' } },
    },
    series: [
      { name: '设计带宽', type: 'bar', data: stats.byBand.map((b) => b.designBw), itemStyle: { color: '#2d4a6e' }, barMaxWidth: 26 },
      { name: '最大带宽(开关通)', type: 'bar', data: stats.byBand.map((b) => b.maxBw), itemStyle: { color: '#64748b' }, barMaxWidth: 26 },
      { name: '已规划', type: 'bar', data: stats.byBand.map((b) => b.plannedBw), itemStyle: { color: '#3b82f6' }, barMaxWidth: 26 },
      { name: '已分配', type: 'bar', data: stats.byBand.map((b) => b.allocatedBw), itemStyle: { color: '#22c55e' }, barMaxWidth: 26 },
      { name: '已用(实际占用)', type: 'bar', data: stats.byBand.map((b) => b.occupiedBw), itemStyle: { color: '#f59e0b' }, barMaxWidth: 26 },
    ],
  };

  const usageOption = stats && {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c} MHz ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
      label: { color: '#94a3b8', fontSize: 11, formatter: '{b}\n{c} MHz' },
      data: stats.byUsageType.map((u) => ({
        name: u.usageType, value: u.bw,
        itemStyle: { color: USAGE_COLORS[u.usageType as keyof typeof USAGE_COLORS] ?? '#64748b' },
      })),
    }],
  };

  return (
    <Spin spinning={loading}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 卫星档案 */}
        <Card size="small" style={cardStyle} title={
          <span>
            {sat?.satelliteName ?? '—'}
            <Tag style={{ marginLeft: 10 }} color={sat?.statusText === '在轨运营' ? 'green' : 'orange'}>
              {sat?.statusText ?? '—'}
            </Tag>
          </span>
        }>
          <Descriptions size="small" column={4} labelStyle={{ color: '#4a6a8a' }}>
            <Descriptions.Item label="卫星代号">{sat?.satelliteCode}</Descriptions.Item>
            <Descriptions.Item label="轨位">{sat?.orbitPosition ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="发射时间">{sat?.launchDate ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="寿命">{sat?.designLife ? `${sat.designLife} 年` : '—'}</Descriptions.Item>
            <Descriptions.Item label="制造商">{sat?.manufacturer ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="平台">{sat?.platform ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="通道组数">{sat?.channelGroupCount ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="矩阵数">{sat?.matrixCount ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="有效载荷" span={2}>
              <span style={{ whiteSpace: 'pre-line' }}>{sat?.payload ?? '—'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="覆盖" span={2}>
              <span style={{ whiteSpace: 'pre-line' }}>{sat?.coverage ?? '—'}</span>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 指标卡:资源规模 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small" style={cardStyle}>
              <Statistic title="设计带宽合计" value={stats?.summary.totalDesignBw ?? 0}
                suffix="MHz" valueStyle={{ color: '#e2e8f0', fontSize: 22 }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={cardStyle}>
              <Tooltip title="口径:开关状态为「通」的输入通道带宽合计">
                <Statistic title="最大带宽(开关通)" value={stats?.usage.maxBw ?? 0}
                  suffix="MHz" valueStyle={{ color: '#94a3b8', fontSize: 22 }} />
              </Tooltip>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={cardStyle}>
              <Statistic title="已规划带宽" value={stats?.summary.totalPlannedBw ?? 0}
                suffix="MHz" valueStyle={{ color: '#3b82f6', fontSize: 22 }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={cardStyle}>
              <Statistic title="有效分配带宽" value={stats?.allocation.validBw ?? 0}
                suffix="MHz" valueStyle={{ color: '#22c55e', fontSize: 22 }} />
            </Card>
          </Col>
        </Row>

        {/* 资源使用统计(详细):已用 = 实际占用(非空闲)的分配带宽 */}
        <Card size="small" style={cardStyle} title="资源使用统计">
          <Row gutter={24} align="middle">
            <Col span={5}>
              <Tooltip title="口径:占用-释放余额>0(非空闲)的分配块带宽合计">
                <Statistic title="已用带宽(实际占用)" value={stats?.usage.occupiedBw ?? 0}
                  suffix="MHz" valueStyle={{ color: '#f59e0b', fontSize: 22 }} />
              </Tooltip>
            </Col>
            <Col span={5}>
              <Statistic title="空闲分配带宽(已分配未占用)" value={stats?.usage.idleAllocatedBw ?? 0}
                suffix="MHz" valueStyle={{ color: '#06b6d4', fontSize: 22 }} />
            </Col>
            <Col span={5}>
              <Statistic title="占用中块数 / 有效分配块"
                value={stats ? `${stats.usage.occupiedBlocks} / ${stats.allocation.validBlocks}` : '—'}
                valueStyle={{ color: '#e2e8f0', fontSize: 22 }} />
            </Col>
            <Col span={9}>
              <div style={{ color: '#4a6a8a', fontSize: 12, marginBottom: 6 }}>
                带宽使用率
                <span style={{ float: 'right', fontFamily: 'monospace', color: '#94a3b8' }}>
                  已用 {stats?.usage.occupiedBw ?? 0} / 最大 {stats?.usage.maxBw ?? 0} MHz
                </span>
              </div>
              <Progress
                percent={stats?.usage.utilization ?? 0}
                strokeColor={{ '0%': '#3b82f6', '100%': '#f59e0b' }}
                trailColor="#16263d"
                format={(p) => <span style={{ color: '#f59e0b' }}>{p}%</span>}
              />
              <div style={{ color: '#334155', fontSize: 11, marginTop: 4 }}>
                口径:最大带宽 = 开关置「通」的通道带宽;已用 = 实际占用(非空闲)的分配带宽
              </div>
            </Col>
          </Row>
        </Card>

        {/* 图表 */}
        <Row gutter={16}>
          <Col span={14}>
            <Card size="small" style={cardStyle} title="各频段带宽(设计 / 最大 / 规划 / 分配 / 已用)">
              {bandOption
                ? <ReactECharts option={bandOption} style={{ height: 280 }} notMerge />
                : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </Card>
          </Col>
          <Col span={10}>
            <Card size="small" style={cardStyle} title="规划用途分布(有效规划块)">
              {usageOption && stats!.byUsageType.length > 0
                ? <ReactECharts option={usageOption} style={{ height: 280 }} notMerge />
                : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无规划数据" />}
            </Card>
          </Col>
        </Row>

        {/* 信标 */}
        <Card size="small" style={cardStyle} title={`信标(${beacons.length})`}>
          {beacons.length === 0
            ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无信标数据" />
            : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {beacons.map((b) => (
                  <Tag key={b.id} style={{ fontFamily: 'monospace', padding: '4px 10px', fontSize: 12 }}>
                    {b.band} · {b.polarization} · {b.frequency} MHz
                  </Tag>
                ))}
              </div>
            )}
        </Card>
      </div>
    </Spin>
  );
}
