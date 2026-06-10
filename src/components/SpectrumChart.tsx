import { fmtFreq } from '@/utils/freqCalc';

type SpectrumItem = {
  frequencyOffset: number;
  occupiedBandwidth: number;
  partitionStatus: 'P' | 'R';
  usageType: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  P: '#1677ff',
  R: '#52c41a',
  '禁用': '#ff4d4f',
  '预览': '#facc15',
};

function getOccStatus(o: SpectrumItem): string {
  if (o.usageType === '禁用') return '禁用';
  if (o.partitionStatus === 'R') return o.usageType ?? '已分配';
  return o.usageType ?? '规划';
}
function getOccColor(o: SpectrumItem): string {
  if (o.usageType === '禁用') return STATUS_COLOR['禁用'];
  return STATUS_COLOR[o.partitionStatus] ?? '#475569';
}

interface SpectrumChartProps {
  rxStartFreq: number | null;
  rxEndFreq: number | null;
  txStartFreq: number | null;
  txEndFreq: number | null;
  channelBw: number | null;
  occupations: SpectrumItem[];
  transponderName: string;
  previewOcc?: { frequencyOffset: number; occupiedBandwidth: number } | null;
  switchOff?: boolean;
}

// ── 布局常量 ──
const SVG_W   = 580;
const PAD_L   = 50;
const PAD_R   = 12;
const INNER_W = SVG_W - PAD_L - PAD_R;
const BAR_H   = 36;   // 每条频带高度
const ROW1_Y  = 32;   // 上行频带 top
const ROW2_Y  = 104;  // 下行频带 top
const SVG_H   = 160;

/** 单条频带上的载波矩形 */
function FreqRow({
  label, freqRange, items, channelBw, rowY, color: _color,
}: {
  label: string;
  freqRange: string;
  items: { x: number; w: number; status: string; color: string; bw: number; start: number; end: number }[];
  channelBw: number;
  rowY: number;
  color?: string;
}) {
  const midY = rowY + BAR_H / 2;
  return (
    <g>
      {/* 行标签 */}
      <text x={2} y={midY + 4} fill="#94a3b8" fontSize={11} fontWeight="bold">{label}</text>
      {/* 频率范围小字 */}
      <text x={PAD_L} y={rowY - 5} fill="#475569" fontSize={10}>{freqRange}</text>
      {/* 背景条 */}
      <rect x={PAD_L} y={rowY} width={INNER_W} height={BAR_H} fill="#1e293b" rx={3} />
      {/* 各载波矩形 */}
      {items.map((item, i) => {
        const color = item.color ?? '#475569';
        const midX  = item.x + item.w / 2;
        return (
          <g key={i}>
            <rect x={item.x} y={rowY + 2} width={item.w} height={BAR_H - 4}
              fill={color} opacity={0.88} rx={2} />
            {/* 状态文字（块够宽） */}
            {item.w >= 34 && (
              <text x={midX} y={midY - 2} textAnchor="middle"
                fill="#fff" fontSize={10} fontWeight="bold">{item.status}</text>
            )}
            {/* 带宽文字 */}
            {item.w >= 34 && (
              <text x={midX} y={midY + 11} textAnchor="middle"
                fill="rgba(255,255,255,0.8)" fontSize={9}>{item.bw}MHz</text>
            )}
            {/* 频率范围（更宽才显示） */}
            {item.w >= 80 && (
              <text x={midX} y={rowY + BAR_H - 2} textAnchor="middle"
                fill="rgba(255,255,255,0.55)" fontSize={8}>
                {item.start.toFixed(1)}~{item.end.toFixed(1)}
              </text>
            )}
            <title>{item.status} {item.bw}MHz | {item.start.toFixed(2)}~{item.end.toFixed(2)} MHz</title>
          </g>
        );
      })}
      {/* 空闲提示 */}
      {items.length === 0 && (
        <text x={PAD_L + INNER_W / 2} y={midY + 4}
          textAnchor="middle" fill="#334155" fontSize={12}>空闲</text>
      )}
      {/* 信道带宽刻度线 */}
      <line x1={PAD_L} y1={rowY + BAR_H} x2={PAD_L + INNER_W} y2={rowY + BAR_H}
        stroke="#334155" strokeWidth={1} />
      <text x={PAD_L} y={rowY + BAR_H + 11} fill="#334155" fontSize={9}>0</text>
      <text x={PAD_L + INNER_W} y={rowY + BAR_H + 11}
        textAnchor="end" fill="#334155" fontSize={9}>{channelBw}MHz</text>
    </g>
  );
}

export default function SpectrumChart({
  rxStartFreq, rxEndFreq, txStartFreq, txEndFreq, channelBw,
  occupations, transponderName, previewOcc, switchOff,
}: SpectrumChartProps) {
  if (rxStartFreq == null || txStartFreq == null || channelBw == null) {
    return (
      <div style={{
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#475569', background: '#0f172a', borderRadius: 8, fontSize: 13,
      }}>
        {transponderName} — 频率数据待补充，暂无法显示频谱图
      </div>
    );
  }

  type Item = { status: string; color: string; offset: number; bw: number };
  const raw: Item[] = occupations.map((o) => ({
    status: getOccStatus(o), color: getOccColor(o), offset: o.frequencyOffset, bw: o.occupiedBandwidth,
  }));
  if (previewOcc) {
    raw.push({ status: '预览', color: STATUS_COLOR['预览'], offset: previewOcc.frequencyOffset, bw: previewOcc.occupiedBandwidth });
  }

  function toBarItems(baseFreq: number) {
    const bw = channelBw!;
    return raw.map((item) => {
      const posRatio = Math.max(0, Math.min(item.offset / bw, 1));
      const wRatio   = Math.max(0, Math.min(item.bw / bw, 1 - posRatio));
      return {
        x:      PAD_L + posRatio * INNER_W,
        w:      Math.max(2, wRatio * INNER_W),
        status: item.status,
        color:  item.color,
        bw:     item.bw,
        start:  baseFreq + item.offset,
        end:    baseFreq + item.offset + item.bw,
      };
    });
  }

  return (
    <div style={{ background: '#0f172a', borderRadius: 8, padding: '4px 0' }}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height={SVG_H} style={{ display: 'block' }}>

        {/* 图例 */}
        {(['规划', '已分配', '禁用'] as const).map((s, i) => {
          const colorKey = s === '规划' ? 'P' : s === '已分配' ? 'R' : '禁用';
          return (
            <g key={s} transform={`translate(${SVG_W - 186 + i * 60}, 14)`}>
              <rect width={11} height={11} fill={STATUS_COLOR[colorKey]} rx={2} />
              <text x={15} y={10} fill="#94a3b8" fontSize={11}>{s}</text>
            </g>
          );
        })}

        <FreqRow
          label="上行"
          freqRange={`Rx：${fmtFreq(rxStartFreq)} ~ ${fmtFreq(rxEndFreq!)} MHz`}
          items={toBarItems(rxStartFreq)}
          channelBw={channelBw}
          rowY={ROW1_Y}
        />
        <FreqRow
          label="下行"
          freqRange={`Tx：${fmtFreq(txStartFreq)} ~ ${fmtFreq(txEndFreq!)} MHz`}
          items={toBarItems(txStartFreq!)}
          channelBw={channelBw}
          rowY={ROW2_Y}
        />

        {/* 开关断开时叠加灰色遮罩 */}
        {switchOff && (
          <>
            <rect x={PAD_L} y={ROW1_Y} width={INNER_W} height={BAR_H} fill="#475569" opacity={0.6} rx={3} />
            <rect x={PAD_L} y={ROW2_Y} width={INNER_W} height={BAR_H} fill="#475569" opacity={0.6} rx={3} />
            <text x={PAD_L + INNER_W / 2} y={ROW1_Y + BAR_H / 2 + 4} textAnchor="middle"
              fill="#94a3b8" fontSize={12} fontWeight="bold">开关已断</text>
            <text x={PAD_L + INNER_W / 2} y={ROW2_Y + BAR_H / 2 + 4} textAnchor="middle"
              fill="#94a3b8" fontSize={12} fontWeight="bold">开关已断</text>
          </>
        )}
      </svg>
    </div>
  );
}


