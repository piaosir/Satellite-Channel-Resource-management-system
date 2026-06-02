import { useMemo } from 'react';
import { Table, Tag, Badge, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Transponder, FrequencyBlock } from '@/types';
import { fmtFreq, fmtPolarization, fmtChannelLabel } from '@/utils/freqCalc';

interface TransponderTableProps {
  transponders: Transponder[];
  occMap: Record<number, FrequencyBlock[]>;
  onRowClick: (t: Transponder) => void;
}

const BAND_COLOR: Record<string, string> = { Ku: 'blue', EKu: 'purple', C: 'green' };

/** 分区状态 + 用途 → 显示颜色 */
function getOccColor(occ: FrequencyBlock): string {
  if (occ.usageType === '禁用') return '#ff4d4f';
  if (occ.partitionStatus === 'P') return '#1677ff';
  return '#52c41a'; // R 回收/空闲
}

/** 分区状态 + 用途 → 显示文字 */
function getOccLabel(occ: FrequencyBlock): string {
  if (occ.usageType === '禁用') return '禁用';
  if (occ.partitionStatus === 'P') return occ.usageType ?? '划分';
  return '空闲';
}

function OccBar({ occs, channelBw, switchOff }: { occs: FrequencyBlock[]; channelBw: number; switchOff?: boolean }) {
  const tip = switchOff
    ? '开关已断，通道不可用'
    : occs.length === 0
      ? '无占用记录'
      : occs.map((o) => `${getOccLabel(o)} ${fmtFreq(o.occupiedBandwidth)}MHz`).join(' / ');

  // 摘要文字：按状态汇总
  const summary = (() => {
    if (switchOff) return '开关已断';
    if (occs.length === 0) return '空闲';
    const totalOcc = occs.reduce((s, o) => s + o.occupiedBandwidth, 0);
    const parts = Object.entries(
      occs.reduce<Record<string, number>>((acc, o) => {
        const label = getOccLabel(o);
        acc[label] = (acc[label] ?? 0) + o.occupiedBandwidth;
        return acc;
      }, {}),
    ).map(([label, bw]) => `${label}${fmtFreq(bw)}MHz`);
    return `${parts.join('/')}（共${fmtFreq(totalOcc)}MHz）`;
  })();

  return (
    <Tooltip title={tip}>
      <div>
        <div style={{
          position: 'relative', height: 18, background: '#0f172a',
          borderRadius: 3, border: '1px solid #334155', overflow: 'hidden', minWidth: 80,
        }}>
          {switchOff ? (
            <div style={{ position: 'absolute', inset: 0, background: '#334155' }} />
          ) : (
            occs.map((occ, i) => {
              const left  = Math.max(0, Math.min(100, (occ.frequencyOffset / channelBw) * 100));
              const width = Math.max(2, Math.min(100 - left, (occ.occupiedBandwidth / channelBw) * 100));
              return (
                <div key={i} style={{
                  position: 'absolute', left: `${left}%`, width: `${width}%`,
                  height: '100%', background: getOccColor(occ),
                  opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {width >= 22 && (
                    <span style={{
                      fontSize: 9, color: '#fff', lineHeight: 1,
                      pointerEvents: 'none', whiteSpace: 'nowrap',
                    }}>
                      {fmtFreq(occ.occupiedBandwidth)}M
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div style={{ fontSize: 10, color: switchOff ? '#475569' : '#64748b', marginTop: 2, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
          {summary}
        </div>
      </div>
    </Tooltip>
  );
}

export default function TransponderTable({ transponders, occMap, onRowClick }: TransponderTableProps) {
  const columns: ColumnsType<Transponder> = useMemo(
    () => [
      {
        title: '通道',
        dataIndex: 'inputChannelShortName',
        width: 120,
        render: (_v, record) => (
          <b style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{fmtChannelLabel(record)}</b>
        ),
        sorter: (a, b) => fmtChannelLabel(a).localeCompare(fmtChannelLabel(b)),
      },
      {
        title: '上行频段',
        dataIndex: 'band',
        width: 75,
        render: (v) => <Tag color={BAND_COLOR[v] ?? 'default'}>{v}</Tag>,
      },
      {
        title: '上行极化',
        dataIndex: 'polarization',
        width: 80,
        render: (v) => fmtPolarization(v),
      },
      {
        title: '上行波束',
        dataIndex: 'antennaName',
        width: 110,
        render: (v) => v ?? <span style={{ color: '#475569' }}>—</span>,
      },
      {
        title: '下行频段',
        dataIndex: 'txBand',
        width: 75,
        render: (v) => v ? <Tag color={BAND_COLOR[v] ?? 'default'}>{v}</Tag> : <span style={{ color: '#475569' }}>—</span>,
      },
      {
        title: '下行极化',
        dataIndex: 'txPolarization',
        width: 80,
        render: (v) => fmtPolarization(v),
      },
      {
        title: '下行波束',
        dataIndex: 'txAntennaName',
        width: 110,
        render: (v) => v ?? <span style={{ color: '#475569' }}>—</span>,
      },
      {
        title: '上行频率',
        width: 165,
        render: (_, r) =>
          r.rxStartFreq != null
            ? `${fmtFreq(r.rxStartFreq)} ~ ${fmtFreq(r.rxEndFreq)} MHz`
            : <span style={{ color: '#475569' }}>待补充</span>,
      },
      {
        title: '下行频率',
        width: 165,
        render: (_, r) =>
          r.txStartFreq != null
            ? `${fmtFreq(r.txStartFreq)} ~ ${fmtFreq(r.txEndFreq)} MHz`
            : <span style={{ color: '#475569' }}>待补充</span>,
      },
      {
        title: '带宽',
        dataIndex: 'channelBw',
        width: 80,
        render: (v) => v != null ? `${v} MHz` : '—',
      },
      {
        title: '开关',
        dataIndex: 'switchStatus',
        width: 70,
        render: (v) => (
          <Badge status={v === 1 ? 'success' : 'error'} text={v === 1 ? '开' : '关'} />
        ),
      },
      {
        title: '类型',
        dataIndex: 'switchType',
        width: 70,
      },
      {
        title: '占用情况',
        width: 160,
        render: (_, r) => {
          const occs = occMap[r.switchId] ?? [];
          if (r.channelBw == null) return <span style={{ color: '#475569' }}>—</span>;
          return <OccBar occs={occs} channelBw={r.channelBw} switchOff={r.switchStatus !== 1} />;
        },
      },
    ],
    [occMap],
  );

  return (
    <Table
      size="small"
      columns={columns}
      dataSource={transponders}
      rowKey="switchId"
      pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
      scroll={{ x: 1400 }}
      onRow={(record) => ({ onClick: () => onRowClick(record), style: { cursor: 'pointer' } })}
    />
  );
}

