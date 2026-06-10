import { useState, useMemo } from 'react';
import { Tooltip } from 'antd';
import { RadarChartOutlined } from '@ant-design/icons';
import type { Transponder } from '@/types';
import { fmtChannelLabel } from '@/utils/freqCalc';

export interface BandPreviewItem {
  switchId: number;
  frequencyOffset: number;
  occupiedBandwidth: number;
  partitionStatus: 'P' | 'R' | 'N' | null;
  usageType: string | null;
  blockValid?: number | null;
  uplinkStartFreq?: number | null;
  uplinkEndFreq?: number | null;
}

interface Props {
  transponders: Transponder[];
  items: BandPreviewItem[];
}

const DARK = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  muted: '#64748b',
};

// [P状态颜色, R状态颜色]
const USAGE_COLORS: Record<string, [string, string]> = {
  出租: ['rgba(59,130,246,0.35)', '#1d4ed8'],
  合作: ['rgba(34,197,94,0.35)',  '#15803d'],
  自用: ['rgba(168,85,247,0.35)', '#7c3aed'],
  禁用: ['rgba(239,68,68,0.35)',  '#991b1b'],
};
const DEFAULT_COLORS: [string, string] = ['rgba(71,85,105,0.35)', '#475569'];

function itemFill(item: BandPreviewItem): string {
  if (item.blockValid === 0) return 'rgba(71,85,105,0.15)';
  const [pColor, rColor] = USAGE_COLORS[item.usageType ?? ''] ?? DEFAULT_COLORS;
  return item.partitionStatus === 'R' ? rColor : pColor;
}

function itemBorder(item: BandPreviewItem): string {
  if (item.blockValid === 0) return 'rgba(71,85,105,0.3)';
  const [, rColor] = USAGE_COLORS[item.usageType ?? ''] ?? DEFAULT_COLORS;
  return item.partitionStatus === 'R' ? rColor + 'cc' : rColor + '55';
}

const LABEL_W = 112;
const BW_W    = 52;
const BAR_H   = 20;
const ROW_H   = 27;

function BlockBar({ item, channelBw }: { item: BandPreviewItem; channelBw: number }) {
  const left  = Math.max(0, Math.min(100, (item.frequencyOffset / channelBw) * 100));
  const width = Math.max(0.3, Math.min(100 - left, (item.occupiedBandwidth / channelBw) * 100));

  const tip = (
    <div style={{ fontSize: 11, lineHeight: 1.6 }}>
      <b>{item.usageType ?? (item.partitionStatus === 'R' ? '回收' : '划分')}</b>
      {item.uplinkStartFreq != null
        ? <div>上行：{item.uplinkStartFreq.toFixed(2)} ~ {item.uplinkEndFreq?.toFixed(2)} MHz</div>
        : <div>偏移：+{item.frequencyOffset} MHz</div>}
      <div>带宽：{item.occupiedBandwidth} MHz</div>
      <div>状态：{item.partitionStatus === 'R' ? '回收（空闲）' : item.partitionStatus === 'P' ? '划分（在用）' : '无效'}</div>
      {item.blockValid === 0 && <div style={{ color: '#f87171' }}>（已失效）</div>}
    </div>
  );

  return (
    <Tooltip title={tip} mouseEnterDelay={0.08}>
      <div style={{
        position: 'absolute',
        left:   `${left}%`,
        width:  `${width}%`,
        height: BAR_H - 2,
        top: 1,
        background: itemFill(item),
        border: `1px solid ${itemBorder(item)}`,
        borderRadius: 2,
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
      }}>
        {width > 9 && (
          <span style={{
            fontSize: 8, color: item.partitionStatus === 'R' ? '#e2e8f0' : '#94a3b8',
            fontWeight: 600, whiteSpace: 'nowrap', padding: '0 2px',
          }}>
            {item.occupiedBandwidth}
          </span>
        )}
      </div>
    </Tooltip>
  );
}

function TpRow({ tp, items }: { tp: Transponder; items: BandPreviewItem[] }) {
  const isOff = tp.switchStatus !== 1;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: ROW_H, gap: 6,
      opacity: isOff ? 0.55 : 1,
    }}>
      <div style={{
        width: LABEL_W, flexShrink: 0,
        fontSize: 10, fontFamily: 'monospace',
        color: isOff ? DARK.muted : '#94a3b8',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {fmtChannelLabel(tp)}
      </div>

      <div style={{
        flex: 1, height: BAR_H, position: 'relative',
        background: DARK.bg, borderRadius: 3, overflow: 'hidden',
      }}>
        {isOff ? (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#334155', opacity: 0.7, borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 9, color: '#475569' }}>开关断开</span>
          </div>
        ) : items.length === 0 ? (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: '#1e293b',
          }}>
            空闲
          </div>
        ) : null}

        {tp.channelBw > 0 && !isOff && items.map((item, j) => (
          <BlockBar key={j} item={item} channelBw={tp.channelBw} />
        ))}
      </div>

      <div style={{
        width: BW_W, flexShrink: 0,
        fontSize: 9, color: DARK.muted, textAlign: 'right',
      }}>
        {tp.channelBw} MHz
      </div>
    </div>
  );
}

const LEGEND = [
  { label: '出租-规划',  color: 'rgba(59,130,246,0.35)' },
  { label: '出租-分配',  color: '#1d4ed8' },
  { label: '合作-分配',  color: '#15803d' },
  { label: '自用-分配',  color: '#7c3aed' },
  { label: '禁用',       color: '#991b1b' },
];

export default function FreqBandPreview({ transponders, items }: Props) {
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<number, BandPreviewItem[]>();
    for (const item of items) {
      if (!map.has(item.switchId)) map.set(item.switchId, []);
      map.get(item.switchId)!.push(item);
    }
    return map;
  }, [items]);

  if (transponders.length === 0) return null;

  return (
    <div style={{ background: DARK.card, borderBottom: `1px solid ${DARK.border}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          all: 'unset', cursor: 'pointer', userSelect: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 24px', fontSize: 12,
          color: open ? '#60a5fa' : DARK.muted,
          transition: 'color 0.15s',
        }}
      >
        <RadarChartOutlined />
        频率段可视化 {open ? '▲' : '▼'}
        <span style={{ fontSize: 10, color: '#334155', marginLeft: 2 }}>
          {transponders.length} 通道
        </span>
      </button>

      {open && (
        <div style={{ padding: '2px 24px 12px' }}>
          {/* 列头 */}
          <div style={{ display: 'flex', alignItems: 'center', height: 18, gap: 6, marginBottom: 2 }}>
            <div style={{ width: LABEL_W, flexShrink: 0 }} />
            <div style={{
              flex: 1, display: 'flex', justifyContent: 'space-between',
              fontSize: 9, color: '#334155',
            }}>
              <span>0 MHz</span>
              <span>← 信道带宽（各通道独立比例）→</span>
              <span>MAX</span>
            </div>
            <div style={{ width: BW_W, flexShrink: 0 }} />
          </div>

          {/* 通道行列表 */}
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {transponders.map((tp) => (
              <TpRow key={tp.switchId} tp={tp} items={grouped.get(tp.switchId) ?? []} />
            ))}
          </div>

          {/* 图例 */}
          <div style={{
            display: 'flex', gap: 14, marginTop: 8,
            paddingTop: 8, borderTop: `1px solid ${DARK.border}`,
            flexWrap: 'wrap',
          }}>
            {LEGEND.map(({ label, color }) => (
              <span key={label} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: DARK.muted,
              }}>
                <span style={{
                  display: 'inline-block', width: 10, height: 10,
                  borderRadius: 2, background: color, flexShrink: 0,
                  border: '1px solid ' + color + 'aa',
                }} />
                {label}
              </span>
            ))}
            <span style={{ fontSize: 10, color: '#334155', marginLeft: 2 }}>
              悬停方块查看详情
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
