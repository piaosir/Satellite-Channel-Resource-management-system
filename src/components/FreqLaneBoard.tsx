/**
 * 频率车道图 — 核心可视化组件
 * ------------------------------
 * 每条车道(上行极化+波束)从上到下三行:
 *   通道基准  — 通道边界(频率计划逻辑表征)
 *   规划层    — 通道规划状态块,按用途着色(基底)
 *   分配层    — 通道分配状态块,嵌在规划范围内,按占用状况着色
 * 规划块/分配块均可点击;在分配模式下点击规划块可发起"在此规划内分配"。
 */
import type { Lane } from '@/utils/freq';
import { USAGE_COLORS, allocColor, allocStatusText, fmtRange } from '@/utils/freq';
import { useContainerWidth } from '@/utils/useContainerWidth';
import type { PlanningBlock, AllocationBlock } from '@/types';

const AXIS_H = 20;
const CHAN_H = 24;
const PLAN_H = 30;
const ALLOC_H = 30;
const GAP = 4;
const LABEL_W = 0; // 标签独立在 SVG 外

interface Props {
  lanes: Lane[];
  showAllocation?: boolean;
  onPlanningClick?: (b: PlanningBlock) => void;
  onAllocationClick?: (b: AllocationBlock) => void;
  highlightPlanningId?: number | null;
}

function niceTicks(min: number, max: number, count = 8): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const rawStep = span / count;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) ticks.push(t);
  return ticks;
}

export default function FreqLaneBoard({
  lanes, showAllocation = false, onPlanningClick, onAllocationClick, highlightPlanningId,
}: Props) {
  const [ref, width] = useContainerWidth(480);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {lanes.map((lane) => (
        <LaneSvg
          key={lane.key}
          lane={lane}
          width={width}
          showAllocation={showAllocation}
          onPlanningClick={onPlanningClick}
          onAllocationClick={onAllocationClick}
          highlightPlanningId={highlightPlanningId}
        />
      ))}
      {lanes.length === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>
          当前卫星暂无可展示的频率数据
        </div>
      )}
    </div>
  );
}

function LaneSvg({
  lane, width, showAllocation, onPlanningClick, onAllocationClick, highlightPlanningId,
}: {
  lane: Lane; width: number; showAllocation: boolean;
  onPlanningClick?: (b: PlanningBlock) => void;
  onAllocationClick?: (b: AllocationBlock) => void;
  highlightPlanningId?: number | null;
}) {
  const pad = (lane.freqMax - lane.freqMin) * 0.01 || 5;
  const f0 = lane.freqMin - pad;
  const f1 = lane.freqMax + pad;
  const x = (f: number) => LABEL_W + ((f - f0) / (f1 - f0)) * (width - LABEL_W);

  const rows: { y: number; h: number }[] = [];
  let y = AXIS_H;
  rows.push({ y, h: CHAN_H }); y += CHAN_H + GAP;          // 通道基准
  rows.push({ y, h: PLAN_H }); y += PLAN_H + GAP;          // 规划层
  if (showAllocation) { rows.push({ y, h: ALLOC_H }); y += ALLOC_H + GAP; }
  const totalH = y + 2;

  const ticks = niceTicks(f0, f1);

  return (
    <div style={{ background: '#0c1a2e', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 14px 8px' }}>
      {/* 车道标题 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>
          {lane.beamName ? `${lane.beamName}` : `波束 ${lane.beam}`}
          <span style={{ color: '#4a6a8a', marginLeft: 6, fontWeight: 400 }}>
            [{lane.beam}] · {lane.polarization} 极化{lane.band ? ` · ${lane.band} 频段` : ''}
          </span>
        </span>
        <span style={{ color: '#4a6a8a', fontSize: 11, fontFamily: 'monospace' }}>
          上行 {fmtRange(lane.freqMin, lane.freqMax)}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ color: '#334155', fontSize: 10 }}>
          通道 {lane.channels.length} · 规划 {lane.planningBlocks.length}
          {showAllocation ? ` · 分配 ${lane.allocationBlocks.length}` : ''}
        </span>
      </div>

      <svg width={width} height={totalH} style={{ display: 'block' }}>
        {/* 行背景与行标 */}
        <RowLabel y={rows[0].y} h={rows[0].h} text="通道基准" />
        <RowLabel y={rows[1].y} h={rows[1].h} text="规划层" />
        {showAllocation && rows[2] && <RowLabel y={rows[2].y} h={rows[2].h} text="分配层" />}

        {/* 频率刻度 */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={AXIS_H - 4} x2={x(t)} y2={totalH - 2} stroke="#16263d" strokeWidth={1} />
            <text x={x(t)} y={AXIS_H - 8} fill="#3d5a7a" fontSize={9} textAnchor="middle" fontFamily="monospace">
              {t}
            </text>
          </g>
        ))}

        {/* 通道基准行(频率计划逻辑表征) */}
        {lane.channels.map((c) => {
          if (c.channelStartFreq == null || c.channelEndFreq == null) return null;
          const cx0 = x(c.channelStartFreq);
          const cw = Math.max(2, x(c.channelEndFreq) - cx0);
          return (
            <g key={c.id}>
              <rect
                x={cx0} y={rows[0].y} width={cw} height={rows[0].h}
                fill="#13243c" stroke="#2d4a6e" strokeWidth={1} rx={2}
              >
                <title>{`${c.commonName ?? c.channelShortName ?? c.channelCode}\n${fmtRange(c.channelStartFreq, c.channelEndFreq)}\n带宽 ${c.channelBandwidth ?? '—'} MHz`}</title>
              </rect>
              {cw > 34 && (
                <text
                  x={cx0 + cw / 2} y={rows[0].y + rows[0].h / 2 + 3}
                  fill="#5b7da3" fontSize={9} textAnchor="middle" fontFamily="monospace"
                  pointerEvents="none"
                >
                  {c.commonName ?? c.channelShortName}
                </text>
              )}
            </g>
          );
        })}

        {/* 规划层 */}
        {lane.planningBlocks.map((p) => {
          if (p.uplinkStartFreq == null || p.uplinkEndFreq == null) return null;
          const px0 = x(p.uplinkStartFreq);
          const pw = Math.max(2, x(p.uplinkEndFreq) - px0);
          const color = p.usageType ? USAGE_COLORS[p.usageType] : '#64748b';
          const invalid = p.isValid === 0;
          const hl = highlightPlanningId === p.id;
          return (
            <g key={p.id}
               style={{ cursor: onPlanningClick ? 'pointer' : 'default' }}
               onClick={() => onPlanningClick?.(p)}>
              <rect
                x={px0} y={rows[1].y} width={pw} height={rows[1].h}
                fill={color} fillOpacity={invalid ? 0.18 : (showAllocation ? 0.4 : 0.75)}
                stroke={hl ? '#fbbf24' : color} strokeWidth={hl ? 2 : 1} rx={3}
                strokeDasharray={invalid ? '4 3' : undefined}
              >
                <title>{`规划块 #${p.id} · ${p.usageType ?? '—'}${invalid ? '(无效)' : ''}\n${fmtRange(p.uplinkStartFreq, p.uplinkEndFreq)} · ${p.bandwidth ?? '—'} MHz\n${p.blockCode}`}</title>
              </rect>
              {pw > 40 && (
                <text
                  x={px0 + pw / 2} y={rows[1].y + rows[1].h / 2 + 3}
                  fill="#fff" fontSize={10} textAnchor="middle" pointerEvents="none"
                >
                  {p.usageType}{pw > 90 ? ` ${p.bandwidth ?? ''}M` : ''}
                </text>
              )}
            </g>
          );
        })}

        {/* 分配层(基于规划,反映实际占用) */}
        {showAllocation && rows[2] && lane.allocationBlocks.map((a) => {
          if (a.uplinkStartFreq == null || a.uplinkEndFreq == null) return null;
          const ax0 = x(a.uplinkStartFreq);
          const aw = Math.max(2, x(a.uplinkEndFreq) - ax0);
          const { fill, outline } = allocColor(a);
          const invalid = a.isValid === 0;
          const orphan = a.planningBlockId == null;
          return (
            <g key={a.id}
               style={{ cursor: onAllocationClick ? 'pointer' : 'default' }}
               onClick={() => onAllocationClick?.(a)}>
              <rect
                x={ax0} y={rows[2].y} width={aw} height={rows[2].h}
                fill={outline ? 'transparent' : fill}
                fillOpacity={invalid ? 0.25 : 0.9}
                stroke={orphan ? '#ef4444' : fill}
                strokeWidth={1}
                strokeDasharray={outline || invalid ? '4 3' : undefined}
                rx={3}
              >
                <title>{`分配块 #${a.id} · ${allocStatusText(a)}${invalid ? '\n[结构无效:已拆分或冲突]' : ''}${orphan ? '\n[警告:未落入任何规划块]' : ''}\n${fmtRange(a.uplinkStartFreq, a.uplinkEndFreq)} · ${a.bandwidth ?? '—'} MHz\n${a.blockCode}`}</title>
              </rect>
              {aw > 50 && (
                <text
                  x={ax0 + aw / 2} y={rows[2].y + rows[2].h / 2 + 3}
                  fill={outline ? '#64748b' : '#0c1a2e'} fontSize={9}
                  textAnchor="middle" pointerEvents="none" fontWeight={600}
                >
                  {(a.contractBalance ?? 0) > 0 ? '占用' : (a.carrierBalance ?? 0) > 0 ? '自用' : '空闲'}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RowLabel({ y, h, text }: { y: number; h: number; text: string }) {
  return (
    <text
      x={2} y={y + h / 2 + 3} fill="#2d4a6e" fontSize={9}
      style={{ userSelect: 'none' }}
    >
      {text}
    </text>
  );
}

/** 图例(规划用途 + 分配占用状态) */
export function LaneLegend({ showAllocation = false }: { showAllocation?: boolean }) {
  const item = (color: string, label: string, dashed = false) => (
    <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 14 }}>
      <span style={{
        width: 12, height: 12, borderRadius: 3,
        background: dashed ? 'transparent' : color,
        border: `1.5px ${dashed ? 'dashed' : 'solid'} ${color}`,
        display: 'inline-block',
      }} />
      <span style={{ color: '#94a3b8', fontSize: 11 }}>{label}</span>
    </span>
  );
  return (
    <div style={{ padding: '6px 2px' }}>
      <span style={{ color: '#4a6a8a', fontSize: 11, marginRight: 10 }}>规划用途:</span>
      {Object.entries(USAGE_COLORS).map(([k, v]) => item(v, k))}
      {showAllocation && (
        <>
          <span style={{ color: '#4a6a8a', fontSize: 11, margin: '0 10px 0 16px' }}>分配占用:</span>
          {item('#f59e0b', '合约占用')}
          {item('#06b6d4', '自用占用')}
          {item('#475569', '空闲', true)}
        </>
      )}
    </div>
  );
}
