import { useMemo } from 'react';
import { Table, Tag, Badge, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Transponder, Occupation } from '@/types';
import { fmtFreq } from '@/utils/freqCalc';

interface TransponderTableProps {
  transponders: Transponder[];
  occMap: Record<number, Occupation[]>;
  onRowClick: (t: Transponder) => void;
}

const BAND_COLOR: Record<string, string> = { Ku: 'blue', EKu: 'purple', C: 'green' };
const STATUS_COLOR: Record<string, string> = { '占用': '#1677ff', '空闲': '#52c41a', '干扰': '#ff4d4f' };

function OccBar({ occs, channelBw, switchOff }: { occs: Occupation[]; channelBw: number; switchOff?: boolean }) {
  const tip = switchOff
    ? '开关已断，通道不可用'
    : occs.length === 0
      ? '无占用记录'
      : occs.map((o) => `${o.occupationStatus} ${fmtFreq(o.occupiedBandwidth)}MHz`).join(' / ');

  // 摘要文字：按状态汇总
  const summary = (() => {
    if (switchOff) return '开关已断';
    if (occs.length === 0) return '空闲';
    const totalOcc = occs.reduce((s, o) => s + o.occupiedBandwidth, 0);
    const parts = Object.entries(
      occs.reduce<Record<string, number>>((acc, o) => {
        acc[o.occupationStatus] = (acc[o.occupationStatus] ?? 0) + o.occupiedBandwidth;
        return acc;
      }, {}),
    ).map(([status, bw]) => `${status}${fmtFreq(bw)}MHz`);
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
                  height: '100%', background: STATUS_COLOR[occ.occupationStatus] ?? '#475569',
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
        title: '转发器',
        dataIndex: 'transponderName',
        width: 90,
        render: (v) => <b style={{ color: '#e2e8f0' }}>{v}</b>,
        sorter: (a, b) => a.transponderName.localeCompare(b.transponderName),
      },
      {
        title: '频段',
        dataIndex: 'band',
        width: 70,
        render: (v) => <Tag color={BAND_COLOR[v] ?? 'default'}>{v}</Tag>,
      },
      {
        title: '极化',
        dataIndex: 'polarization',
        width: 60,
        render: (v) => v ?? '—',
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
      scroll={{ x: 1000 }}
      onRow={(record) => ({ onClick: () => onRowClick(record), style: { cursor: 'pointer' } })}
    />
  );
}

