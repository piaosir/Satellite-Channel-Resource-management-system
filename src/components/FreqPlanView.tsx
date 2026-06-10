import { useState, useMemo } from 'react';
import { Popover, Button, Tag, Popconfirm, Divider, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Transponder } from '@/types';
import { fmtChannelLabel } from '@/utils/freqCalc';

// ──────────────────────────────────────────────────────────────────
// 公共类型（OccupationRecordFull 和 FrequencyBlockFull 均可直接传入）
// ──────────────────────────────────────────────────────────────────
export interface FreqPlanItem {
  id: number;
  switchId: number;
  frequencyOffset: number;
  occupiedBandwidth: number;
  partitionStatus: 'P' | 'R' | 'N' | null;
  usageType: string | null;
  blockValid?: number | null;
  uplinkStartFreq?: number | null;
  uplinkEndFreq?: number | null;
  downlinkStartFreq?: number | null;
  downlinkEndFreq?: number | null;
  // 分配块字段
  occupationCode?: string | null;
  planningBlockCode?: string | null;
  remarkUser?: string | null;
  remarkFulfillment?: string | null;
  // 规划块字段
  frequencyBlockCode2?: string | null;
  frequencyBlockCode?: string | null;
}

interface Props {
  transponders: Transponder[];
  items: FreqPlanItem[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

// ──────────────────────────────────────────────────────────────────
// 颜色体系
// ──────────────────────────────────────────────────────────────────
const USAGE: Record<string, { bg: string; alpha: string; label: string; border: string }> = {
  出租: { bg: '#1e3a8a', alpha: 'rgba(30,58,138,0.45)',  label: '#93c5fd', border: '#3b82f6' },
  合作: { bg: '#14532d', alpha: 'rgba(20,83,45,0.45)',   label: '#86efac', border: '#22c55e' },
  自用: { bg: '#4c1d95', alpha: 'rgba(76,29,149,0.45)',  label: '#c4b5fd', border: '#8b5cf6' },
  禁用: { bg: '#7f1d1d', alpha: 'rgba(127,29,29,0.45)', label: '#fca5a5', border: '#ef4444' },
};
const DEFAULT_C = { bg: '#1e3a5f', alpha: 'rgba(30,58,95,0.45)', label: '#7dd3fc', border: '#0ea5e9' };

const BAND_COLOR: Record<string, string> = {
  Ku: 'blue', EKu: 'purple', Ka: 'success', C: 'warning',
};

function usageStyle(usageType: string | null) {
  return USAGE[usageType ?? ''] ?? DEFAULT_C;
}

function statusLabel(item: FreqPlanItem) {
  if (item.blockValid === 0) return '已失效';
  if (item.partitionStatus === 'R') return '回收';
  if (item.partitionStatus === 'P') return '划分';
  return '无效';
}

// ──────────────────────────────────────────────────────────────────
// Popover 内容
// ──────────────────────────────────────────────────────────────────
function BlockDetail({
  item, tp, onEdit, onDelete, closePopover,
}: {
  item: FreqPlanItem;
  tp: Transponder;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  closePopover: () => void;
}) {
  const code = item.occupationCode
    ?? item.frequencyBlockCode2
    ?? item.frequencyBlockCode
    ?? `ID ${item.id}`;
  const sty = usageStyle(item.usageType);
  const invalid = item.blockValid === 0;

  return (
    <div style={{ width: 268, fontSize: 12 }}>
      {/* 用途 + 状态 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <Tag
          color={item.usageType === '出租' ? 'blue' : item.usageType === '合作' ? 'success'
            : item.usageType === '自用' ? 'purple' : item.usageType === '禁用' ? 'error' : 'default'}
          style={{ margin: 0 }}
        >
          {item.usageType ?? '未设置'}
        </Tag>
        <Tag
          color={item.partitionStatus === 'R' ? 'success' : item.partitionStatus === 'P' ? 'blue' : 'default'}
          style={{ margin: 0 }}
        >
          {statusLabel(item)}
        </Tag>
        {invalid && <Tag color="default" style={{ margin: 0 }}>已失效</Tag>}
      </div>

      {/* 代码 */}
      <div style={{
        color: '#94a3b8', fontFamily: 'monospace', fontSize: 10,
        marginBottom: 8, wordBreak: 'break-all', lineHeight: 1.5,
        background: '#0f172a', borderRadius: 4, padding: '4px 6px',
      }}>
        {code}
      </div>

      {/* 详细字段 */}
      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '4px 8px' }}>
        <span style={{ color: '#64748b' }}>带宽</span>
        <span style={{ color: '#e2e8f0' }}>{item.occupiedBandwidth} MHz</span>

        <span style={{ color: '#64748b' }}>偏移</span>
        <span style={{ color: '#e2e8f0' }}>+{item.frequencyOffset} MHz</span>

        {item.uplinkStartFreq != null && <>
          <span style={{ color: '#64748b' }}>上行</span>
          <span style={{ color: '#e2e8f0' }}>
            {item.uplinkStartFreq.toFixed(2)} ~ {item.uplinkEndFreq?.toFixed(2)} MHz
          </span>
        </>}

        {item.downlinkStartFreq != null && <>
          <span style={{ color: '#64748b' }}>下行</span>
          <span style={{ color: '#e2e8f0' }}>
            {item.downlinkStartFreq.toFixed(2)} ~ {item.downlinkEndFreq?.toFixed(2)} MHz
          </span>
        </>}

        {item.planningBlockCode && <>
          <span style={{ color: '#64748b' }}>规划块</span>
          <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 10 }}>
            {item.planningBlockCode}
          </span>
        </>}

        {item.remarkUser && <>
          <span style={{ color: '#64748b' }}>用户</span>
          <span style={{ color: '#e2e8f0' }}>{item.remarkUser}</span>
        </>}

        {item.remarkFulfillment && <>
          <span style={{ color: '#64748b' }}>履约</span>
          <span style={{ color: '#e2e8f0' }}>{item.remarkFulfillment}</span>
        </>}

        <span style={{ color: '#64748b' }}>通道</span>
        <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}>
          {fmtChannelLabel(tp)}
        </span>
      </div>

      {(onEdit || onDelete) && (
        <>
          <Divider style={{ margin: '10px 0', borderColor: '#1e293b' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {onEdit && (
              <Button
                size="small"
                type="primary"
                icon={<EditOutlined />}
                style={{ flex: 1 }}
                onClick={() => { closePopover(); onEdit(item.id); }}
              >
                编辑
              </Button>
            )}
            {onDelete && (
              <Popconfirm
                title="确认删除？"
                description="此操作不可恢复"
                onConfirm={() => { closePopover(); onDelete(item.id); }}
                okText="删除" cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} style={{ flex: 1 }}>
                  删除
                </Button>
              </Popconfirm>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 单个频率块矩形
// ──────────────────────────────────────────────────────────────────
function Block({
  item, tp, channelBw, onEdit, onDelete,
}: {
  item: FreqPlanItem;
  tp: Transponder;
  channelBw: number;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const left  = Math.max(0, Math.min(100, (item.frequencyOffset / channelBw) * 100));
  const width = Math.max(0.4, Math.min(100 - left, (item.occupiedBandwidth / channelBw) * 100));

  const sty     = usageStyle(item.usageType);
  const invalid = item.blockValid === 0 || item.partitionStatus === 'N';
  const isP     = item.partitionStatus === 'P' && !invalid;

  const bgColor     = invalid ? 'rgba(71,85,105,0.18)' : isP ? sty.alpha : sty.bg;
  const borderColor = invalid ? '#334155' : isP ? sty.border + '80' : sty.border;
  const textColor   = invalid ? '#475569' : sty.label;
  const borderStyle = isP ? 'dashed' : 'solid';

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="topLeft"
      arrow={false}
      content={
        <BlockDetail
          item={item}
          tp={tp}
          onEdit={onEdit}
          onDelete={onDelete}
          closePopover={() => setOpen(false)}
        />
      }
      styles={{ body: { background: '#1e293b', padding: '12px', border: '1px solid #334155', borderRadius: 6 } }}
    >
      <Tooltip
        title={!open
          ? `${item.usageType ?? '未设置'} · ${item.occupiedBandwidth}MHz${item.uplinkStartFreq != null ? ` · ${item.uplinkStartFreq.toFixed(1)}~${item.uplinkEndFreq?.toFixed(1)}MHz` : ''}`
          : undefined}
        mouseEnterDelay={0.4}
      >
        <div
          style={{
            position: 'absolute',
            left:   `${left}%`,
            width:  `${width}%`,
            top: 3,
            bottom: 3,
            background:  bgColor,
            border:      `1px ${borderStyle} ${borderColor}`,
            borderRadius: 3,
            cursor:       'pointer',
            boxSizing:    'border-box',
            overflow:     'hidden',
            display:      'flex',
            flexDirection:'column',
            alignItems:   'center',
            justifyContent:'center',
            transition:   'filter 0.12s, border-color 0.12s',
            userSelect:   'none',
          }}
          onMouseEnter={(e) => {
            if (!open) (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.filter = '';
          }}
        >
          {/* 用途标签 */}
          {width > 4 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: textColor,
              whiteSpace: 'nowrap', overflow: 'hidden',
              maxWidth: '96%', textOverflow: 'ellipsis',
              lineHeight: 1.3,
            }}>
              {item.usageType ?? (isP ? '划分' : '回收')}
            </span>
          )}
          {/* 带宽 */}
          {width > 7 && (
            <span style={{
              fontSize: 9, color: textColor + 'bb',
              whiteSpace: 'nowrap', lineHeight: 1.2,
            }}>
              {item.occupiedBandwidth}MHz
            </span>
          )}
        </div>
      </Tooltip>
    </Popover>
  );
}

// ──────────────────────────────────────────────────────────────────
// 通道行
// ──────────────────────────────────────────────────────────────────
function ChannelRow({
  tp, items, onEdit, onDelete,
}: {
  tp: Transponder;
  items: FreqPlanItem[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}) {
  const isOff = tp.switchStatus !== 1;
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.frequencyOffset - b.frequencyOffset),
    [items],
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 0',
      borderBottom: '1px solid #0f172a',
      opacity: isOff ? 0.4 : 1,
    }}>
      {/* 通道标签 */}
      <div style={{ width: 148, flexShrink: 0 }}>
        <div style={{
          fontSize: 11, fontFamily: 'monospace', color: '#94a3b8',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 3,
        }}>
          {fmtChannelLabel(tp)}
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <Tag
            color={BAND_COLOR[tp.band] ?? 'default'}
            style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}
          >
            {tp.band}
          </Tag>
          {tp.polarization && (
            <span style={{ fontSize: 10, color: '#64748b' }}>{tp.polarization}</span>
          )}
          {isOff && <span style={{ fontSize: 10, color: '#475569' }}>断路</span>}
        </div>
      </div>

      {/* 频率条 */}
      <div style={{
        flex: 1, height: 46, position: 'relative',
        background: '#070d1a',
        borderRadius: 4,
        border: '1px solid #1a2540',
        overflow: 'hidden',
      }}>
        {/* 频率刻度线（背景辅助线，每 20% 一条） */}
        {[20, 40, 60, 80].map((pct) => (
          <div key={pct} style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${pct}%`, width: 1,
            background: '#1e293b', pointerEvents: 'none',
          }} />
        ))}

        {/* 开关断开遮罩 */}
        {isOff && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'rgba(51,65,85,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>开关断路</span>
          </div>
        )}

        {/* 空闲 */}
        {sorted.length === 0 && !isOff && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, color: '#1e3a5f' }}>空闲</span>
          </div>
        )}

        {/* 频率块 */}
        {tp.channelBw > 0 && !isOff && sorted.map((item) => (
          <Block
            key={item.id}
            item={item}
            tp={tp}
            channelBw={tp.channelBw}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* 带宽标签 */}
      <div style={{
        width: 56, flexShrink: 0,
        textAlign: 'right', fontSize: 10, color: '#334155',
      }}>
        {tp.channelBw} MHz
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// 主组件
// ──────────────────────────────────────────────────────────────────
const LEGEND = [
  { label: '出租', sty: USAGE['出租'] },
  { label: '合作', sty: USAGE['合作'] },
  { label: '自用', sty: USAGE['自用'] },
  { label: '禁用', sty: USAGE['禁用'] },
] as const;

export default function FreqPlanView({ transponders, items, onEdit, onDelete }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<number, FreqPlanItem[]>();
    for (const item of items) {
      if (!map.has(item.switchId)) map.set(item.switchId, []);
      map.get(item.switchId)!.push(item);
    }
    return map;
  }, [items]);

  // 统计
  const stats = useMemo(() => {
    const byUsage: Record<string, number> = {};
    let totalBw = 0;
    for (const item of items) {
      if (item.blockValid !== 0) {
        const k = item.usageType ?? '未设置';
        byUsage[k] = (byUsage[k] ?? 0) + item.occupiedBandwidth;
        totalBw += item.occupiedBandwidth;
      }
    }
    return { byUsage, totalBw };
  }, [items]);

  if (transponders.length === 0) {
    return (
      <div style={{
        padding: '40px 24px', textAlign: 'center',
        color: '#334155', fontSize: 13, background: '#0f172a', borderRadius: 8,
      }}>
        请先选择卫星
      </div>
    );
  }

  return (
    <div style={{
      background: '#0c1420',
      borderRadius: 8,
      border: '1px solid #1a2540',
      overflow: 'hidden',
    }}>
      {/* ── 标题栏 ── */}
      <div style={{
        padding: '10px 16px',
        background: '#0f172a',
        borderBottom: '1px solid #1a2540',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
            频率规划 · {transponders.length} 通道
          </span>
          <span style={{ fontSize: 11, color: '#334155' }}>
            总占用 <b style={{ color: '#94a3b8' }}>{stats.totalBw.toFixed(0)}</b> MHz
          </span>
          {Object.entries(stats.byUsage).map(([k, bw]) => (
            <span key={k} style={{
              fontSize: 11, color: '#334155',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                background: usageStyle(k).bg,
                border: `1px solid ${usageStyle(k).border}`,
              }} />
              {k} {bw.toFixed(0)}MHz
            </span>
          ))}
        </div>

        {/* 图例 */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {LEGEND.map(({ label, sty }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}>
              <span style={{
                display: 'inline-block', width: 24, height: 12, borderRadius: 2,
                background: sty.bg, border: `1px solid ${sty.border}`, flexShrink: 0,
              }} />
              {label}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#334155' }}>
            <span style={{
              display: 'inline-block', width: 24, height: 12, borderRadius: 2,
              background: USAGE['出租'].alpha, border: `1px dashed ${USAGE['出租'].border}80`,
            }} />
            规划中（虚线）
          </span>
          <span style={{ fontSize: 10, color: '#1e3a5f' }}>点击色块查看详情</span>
        </div>
      </div>

      {/* ── 列标题 ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '3px 16px',
        background: '#0a1020',
        borderBottom: '1px solid #1a2540',
      }}>
        <div style={{ width: 148, flexShrink: 0, fontSize: 9, color: '#1e3a5f' }}>通道</div>
        <div style={{ flex: 1, fontSize: 9, color: '#1e3a5f', textAlign: 'center' }}>
          ← 各通道以自身带宽为 100%（独立比例），点击块查看/操作 →
        </div>
        <div style={{ width: 56, flexShrink: 0, fontSize: 9, color: '#1e3a5f', textAlign: 'right' }}>带宽</div>
      </div>

      {/* ── 通道行 ── */}
      <div style={{ padding: '0 16px', maxHeight: 540, overflowY: 'auto' }}>
        {transponders.map((tp) => (
          <ChannelRow
            key={tp.switchId}
            tp={tp}
            items={grouped.get(tp.switchId) ?? []}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
