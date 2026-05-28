import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '@/store/useStore';
import { fetchFrequencyBlocksBySatellite, fetchTransponders } from '@/api';
import type { FrequencyBlockFull, Transponder } from '@/types';

interface Stats {
  totalBw: number;
  usedBw: number;
  recoveredBw: number;
  byBand: Record<string, number>;
  byUsageType: Record<string, number>;
  designBwByBand: Record<string, number>;
  occupiedBwByBand: Record<string, number>;
}

function calcStats(blocks: FrequencyBlockFull[], transponders: Transponder[]): Stats {
  let totalBw = 0, usedBw = 0, recoveredBw = 0;
  const byBand: Record<string, number> = {};
  const byUsageType: Record<string, number> = {};
  const occupiedBwByBand: Record<string, number> = {};

  for (const b of blocks) {
    const bw = b.occupiedBandwidth ?? 0;
    totalBw += bw;
    if (b.partitionStatus === 'P') usedBw += bw;
    else recoveredBw += bw;

    const band = b.band ?? '未知';
    byBand[band] = (byBand[band] ?? 0) + bw;
    occupiedBwByBand[band] = (occupiedBwByBand[band] ?? 0) + bw;

    if (b.partitionStatus === 'P') {
      const type = b.usageType ?? '未分类';
      byUsageType[type] = (byUsageType[type] ?? 0) + bw;
    }
  }

  // 总设计带宽：各转发器 channelBw 按频段求和
  const designBwByBand: Record<string, number> = {};
  for (const t of transponders) {
    const band = t.band ?? '未知';
    designBwByBand[band] = (designBwByBand[band] ?? 0) + (t.channelBw ?? 0);
  }

  return { totalBw, usedBw, recoveredBw, byBand, byUsageType, designBwByBand, occupiedBwByBand };
}

const cardStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 12,
  padding: '20px 28px',
  flex: 1,
  minWidth: 180,
};

export default function ResourceStats() {
  const { selectedSatelliteId } = useStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSatelliteId) return;
    setLoading(true);
    Promise.all([
      fetchFrequencyBlocksBySatellite(selectedSatelliteId),
      fetchTransponders(selectedSatelliteId),
    ])
      .then(([blocks, transponders]) => setStats(calcStats(blocks, transponders)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSatelliteId]);

  const usedRate = stats && stats.totalBw > 0
    ? ((stats.usedBw / stats.totalBw) * 100).toFixed(1)
    : '0.0';
  const recoveredRate = stats && stats.totalBw > 0
    ? ((stats.recoveredBw / stats.totalBw) * 100).toFixed(1)
    : '0.0';

  const pieOption = stats
    ? {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: '{b}: {c} MHz ({d}%)' },
        legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 12 } },
        series: [
          {
            type: 'pie',
            radius: ['40%', '65%'],
            center: ['50%', '44%'],
            data: Object.entries(stats.byBand).map(([name, value]) => ({ name, value: +value.toFixed(2) })),
            label: { show: true, color: '#94a3b8', fontSize: 12 },
            itemStyle: { borderRadius: 4, borderColor: '#0f172a', borderWidth: 2 },
          },
        ],
      }
    : {};

  const barOption = stats
    ? {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        grid: { left: 60, right: 20, top: 20, bottom: 40 },
        xAxis: {
          type: 'category',
          data: Object.keys(stats.byUsageType),
          axisLabel: { color: '#94a3b8', fontSize: 12 },
          axisLine: { lineStyle: { color: '#334155' } },
        },
        yAxis: {
          type: 'value',
          name: 'MHz',
          nameTextStyle: { color: '#64748b', fontSize: 11 },
          axisLabel: { color: '#94a3b8', fontSize: 11 },
          splitLine: { lineStyle: { color: '#1e293b' } },
        },
        series: [
          {
            type: 'bar',
            data: Object.values(stats.byUsageType).map((v) => +v.toFixed(2)),
            barMaxWidth: 60,
            itemStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: '#3b82f6' },
                  { offset: 1, color: '#1d4ed8' },
                ],
              },
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
      }
    : {};

  // 频段占用 vs 设计带宽对比图（垂直堆叠柱图）
  const bandCompareOption = (() => {
    if (!stats) return {};
    const allBands = [...new Set([
      ...Object.keys(stats.designBwByBand),
      ...Object.keys(stats.occupiedBwByBand),
    ])].sort();

    const designVals   = allBands.map((b) => +(stats.designBwByBand[b]  ?? 0).toFixed(2));
    const occupiedVals = allBands.map((b) => +(stats.occupiedBwByBand[b] ?? 0).toFixed(2));
    const freeVals     = allBands.map((b) => {
      const free = (stats.designBwByBand[b] ?? 0) - (stats.occupiedBwByBand[b] ?? 0);
      return +Math.max(free, 0).toFixed(2);
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ dataIndex: number }>) => {
          const i = params[0]?.dataIndex ?? 0;
          const band    = allBands[i] ?? '';
          const design  = designVals[i] ?? 0;
          const occ     = occupiedVals[i] ?? 0;
          const free    = freeVals[i] ?? 0;
          const pct     = design > 0 ? ((occ / design) * 100).toFixed(1) : '0.0';
          return [
            `<b>${band} 频段</b>`,
            `总设计带宽：<b>${design} MHz</b>`,
            `已占用：<b style="color:#60a5fa">${occ} MHz</b>`,
            `未占用：<span style="color:#475569">${free} MHz</span>`,
            `占用率：<b style="color:#22c55e">${pct}%</b>`,
          ].join('<br/>');
        },
      },
      legend: {
        bottom: 4,
        textStyle: { color: '#94a3b8', fontSize: 12 },
        itemWidth: 12,
        itemHeight: 12,
        data: [
          { name: '已占用带宽', icon: 'roundRect' },
          { name: '未占用带宽', icon: 'roundRect' },
        ],
      },
      grid: { left: 64, right: 24, top: 36, bottom: 52 },
      xAxis: {
        type: 'category',
        data: allBands,
        axisLabel: {
          color: '#94a3b8',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'monospace',
        },
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'MHz',
        nameTextStyle: { color: '#64748b', fontSize: 11, padding: [0, 8, 0, 0] },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e3a5f', type: 'dashed', opacity: 0.6 } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: '已占用带宽',
          type: 'bar',
          stack: 'bw',
          data: occupiedVals,
          barMaxWidth: 96,
          barCategoryGap: '48%',
          z: 3,
          itemStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#60a5fa' },
                { offset: 1, color: '#1d4ed8' },
              ],
            },
            borderRadius: [0, 0, 4, 4],
          },
          label: {
            show: true,
            position: 'inside',
            color: '#e2e8f0',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'monospace',
            formatter: (p: { value: number }) =>
              p.value >= 50 ? `${p.value} MHz` : '',
          },
        },
        {
          name: '未占用带宽',
          type: 'bar',
          stack: 'bw',
          data: freeVals,
          barMaxWidth: 96,
          z: 2,
          itemStyle: {
            color: 'rgba(30, 58, 95, 0.45)',
            borderColor: 'rgba(71, 85, 105, 0.4)',
            borderWidth: 1,
            borderRadius: [4, 4, 0, 0],
          },
          label: {
            show: true,
            position: 'top',
            distance: 10,
            formatter: (p: { dataIndex: number; value: number }) => {
              const i = p.dataIndex;
              const design = designVals[i] ?? 0;
              const occ    = occupiedVals[i] ?? 0;
              const pct    = design > 0 ? ((occ / design) * 100).toFixed(1) : '0.0';
              return `{d|${design} MHz}   {r|${pct}%}`;
            },
            rich: {
              d: {
                color: '#64748b',
                fontSize: 11,
                fontFamily: 'monospace',
              },
              r: {
                color: '#22c55e',
                fontSize: 13,
                fontWeight: 'bold',
                fontFamily: 'monospace',
              },
            },
          },
        },
      ],
    };
  })();

  const hasBandData = stats &&
    (Object.keys(stats.designBwByBand).length > 0 || Object.keys(stats.occupiedBwByBand).length > 0);

  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        数据概览
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 32px' }}>
        资源统计
      </h1>

      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>总占用带宽</div>
          <div style={{ color: '#3b82f6', fontSize: 32, fontWeight: 700, fontFamily: 'monospace' }}>
            {loading ? '—' : `${stats?.totalBw.toFixed(1) ?? 0}`}
          </div>
          <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>MHz</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>在用率</div>
          <div style={{ color: '#22c55e', fontSize: 32, fontWeight: 700, fontFamily: 'monospace' }}>
            {loading ? '—' : `${usedRate}%`}
          </div>
          <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>划分状态 P</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>回收率</div>
          <div style={{ color: '#f59e0b', fontSize: 32, fontWeight: 700, fontFamily: 'monospace' }}>
            {loading ? '—' : `${recoveredRate}%`}
          </div>
          <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>回收状态 R</div>
        </div>
      </div>

      {/* 频段占用 vs 设计带宽对比图（全宽） */}
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
            各频段占用带宽 vs 总设计带宽
          </div>
          <div style={{ color: '#475569', fontSize: 11 }}>
            （灰柱：总设计带宽 · 蓝柱：已占用带宽 · 绿线：占用率）
          </div>
        </div>
        {!loading && hasBandData ? (
          <ReactECharts option={bandCompareOption} style={{ height: 260 }} />
        ) : (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            {loading ? '加载中...' : '暂无数据'}
          </div>
        )}
      </div>

      {/* 频段分布 + 使用类型图表 */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 1,
            minWidth: 320,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: '20px 24px',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            按频段占用分布（MHz）
          </div>
          {!loading && stats && Object.keys(stats.byBand).length > 0 ? (
            <ReactECharts option={pieOption} style={{ height: 300 }} />
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              {loading ? '加载中...' : '暂无数据'}
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 320,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: '20px 24px',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            按使用类型统计（在用，MHz）
          </div>
          {!loading && stats && Object.keys(stats.byUsageType).length > 0 ? (
            <ReactECharts option={barOption} style={{ height: 300 }} />
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              {loading ? '加载中...' : '暂无在用数据'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
