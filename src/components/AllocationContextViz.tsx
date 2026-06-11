/**
 * 分配块频谱上下文图
 * --------------------
 * 在所属规划块的频率范围内,画出全部兄弟分配块的占位:
 *   · 上行 / 下行 两条频带成对展示(上下行频率对是工程师的关注点)
 *   · 当前块高亮(金色描边);其余兄弟块按占用状况着色并淡化
 *   · 创建模式:空隙可点击(自动填入频率范围),预览块虚线实时渲染
 */
import { useContainerWidth } from '@/utils/useContainerWidth';
import { allocColor, USAGE_COLORS, computeGaps } from '@/utils/freq';
import type { Gap } from '@/utils/freq';
import type { PlanningBlock, AllocationBlock } from '@/types';

interface Props {
  planning: PlanningBlock;
  siblings: AllocationBlock[];         // 该规划块下全部分配块
  selfId?: number;                     // 详情模式:高亮的当前块
  preview?: Gap | null;                // 创建模式:实时预览范围(上行)
  onGapClick?: (gap: Gap) => void;     // 创建模式:点击空隙回填表单
  onBlockClick?: (b: AllocationBlock) => void;  // 点击已有分配块(选中进入编辑)
  beamNames?: Record<string, string>;  // 波束代号 → 中文波束名
}

const ROW_H = 40;
const BAR_H = 22;
const LBL_H = 14;

export default function AllocationContextViz({
  planning, siblings, selfId, preview, onGapClick, onBlockClick, beamNames = {},
}: Props) {
  const [ref, width] = useContainerWidth();

  const pUs = Number(planning.uplinkStartFreq ?? 0);
  const pUe = Number(planning.uplinkEndFreq ?? 0);
  const pDs = Number(planning.downlinkStartFreq ?? 0);
  const span = pUe - pUs || 1;
  const pad = span * 0.04;
  const f0 = pUs - pad, f1 = pUe + pad;
  const x = (f: number) => ((f - f0) / (f1 - f0)) * width;
  // 上行频率 → 下行频率(成对平移)
  const toDown = (uf: number) => pDs + (uf - pUs);

  const gaps = computeGaps(pUs, pUe, siblings
    .filter((s) => s.id !== undefined && s.uplinkStartFreq != null && s.uplinkEndFreq != null)
    .map((s) => ({ us: Number(s.uplinkStartFreq), ue: Number(s.uplinkEndFreq) })));

  const planColor = planning.usageType ? USAGE_COLORS[planning.usageType] : '#64748b';

  // 频标游标:操作中的范围(创建/编辑预览优先,否则取当前块),
  // 贯穿上下行两行,中间标注上下行起止、中心频点与带宽,方便对照操作
  const marker = (() => {
    if (preview && preview.ue > preview.us) {
      return { us: preview.us, ue: preview.ue, ds: toDown(preview.us), de: toDown(preview.ue) };
    }
    if (selfId != null) {
      const s = siblings.find((b) => b.id === selfId);
      if (s && s.uplinkStartFreq != null && s.uplinkEndFreq != null) {
        return {
          us: Number(s.uplinkStartFreq), ue: Number(s.uplinkEndFreq),
          ds: s.downlinkStartFreq != null ? Number(s.downlinkStartFreq) : toDown(Number(s.uplinkStartFreq)),
          de: s.downlinkEndFreq != null ? Number(s.downlinkEndFreq) : toDown(Number(s.uplinkEndFreq)),
        };
      }
    }
    return null;
  })();

  const MID_H = marker ? 20 : 6;                       // 两行之间的频标信息带
  const row1Y = LBL_H;
  const row2Y = LBL_H + ROW_H + LBL_H + MID_H;
  const totalH = row2Y + ROW_H + LBL_H + 6;

  const renderRow = (rowY: number, isUp: boolean) => {
    const barY = rowY + 4;
    const rowLabel = isUp ? '上行' : '下行';
    const rs = isUp ? pUs : pDs;
    const re = isUp ? pUe : pDs + span;
    return (
      <g key={rowLabel}>
        <text x={0} y={barY + BAR_H / 2 + 3} fill="#4a6a8a" fontSize={10}>{rowLabel}</text>
        <text x={0} y={barY + BAR_H / 2 + 14} fill="#334155" fontSize={8}>
          {(() => {
            const pol = isUp ? planning.uplinkPolarization : planning.downlinkPolarization;
            const beam = isUp ? planning.uplinkBeam : planning.downlinkBeam;
            const name = beam ? beamNames[beam] : undefined;
            return `${pol ?? ''}/${name ?? beam ?? ''}`;
          })()}
        </text>
        {/* 规划块边框 */}
        <rect x={x(pUs)} y={barY} width={x(pUe) - x(pUs)} height={BAR_H}
          fill={planColor} fillOpacity={0.08} stroke={planColor} strokeWidth={1.2} rx={3} />
        {/* 规划块端点频率 */}
        <text x={x(pUs)} y={barY + BAR_H + 11} fill="#4a6a8a" fontSize={9} fontFamily="monospace" textAnchor="middle">
          {rs.toFixed(2)}
        </text>
        <text x={x(pUe)} y={barY + BAR_H + 11} fill="#4a6a8a" fontSize={9} fontFamily="monospace" textAnchor="middle">
          {re.toFixed(2)}
        </text>

        {/* 空隙(创建模式可点击) */}
        {onGapClick && gaps.map((g, i) => {
          const gx = x(g.us), gw = Math.max(2, x(g.ue) - x(g.us));
          return (
            <g key={`gap${i}`} style={{ cursor: 'pointer' }}
               onClick={() => onGapClick(g)}>
              <rect x={gx} y={barY + 2} width={gw} height={BAR_H - 4}
                fill="#22c55e" fillOpacity={0.06} stroke="#22c55e" strokeOpacity={0.45}
                strokeWidth={1} strokeDasharray="3 3" rx={2}>
                <title>{`空闲 ${(g.ue - g.us).toFixed(2)} MHz\n点击选用该频段`}</title>
              </rect>
              {gw > 44 && (
                <text x={gx + gw / 2} y={barY + BAR_H / 2 + 3}
                  fill="#22c55e" fillOpacity={0.7} fontSize={9} textAnchor="middle" pointerEvents="none">
                  +{(g.ue - g.us).toFixed(1)}M
                </text>
              )}
            </g>
          );
        })}

        {/* 兄弟分配块 */}
        {siblings.map((s) => {
          const sus = isUp ? s.uplinkStartFreq : s.downlinkStartFreq;
          const sue = isUp ? s.uplinkEndFreq : s.downlinkEndFreq;
          if (sus == null || sue == null) return null;
          // 下行行用上行坐标平移定位(确保两行对齐),标签用真实下行频率
          const us0 = isUp ? Number(sus) : Number(s.uplinkStartFreq ?? pUs);
          const ue0 = isUp ? Number(sue) : Number(s.uplinkEndFreq ?? pUe);
          const bx = x(us0), bw = Math.max(2, x(ue0) - x(us0));
          const isSelf = s.id === selfId;
          const { fill, outline } = allocColor(s);
          return (
            <g key={s.id}
               style={{ cursor: onBlockClick ? 'pointer' : undefined }}
               onClick={() => onBlockClick?.(s)}>
              <rect x={bx} y={barY + 2} width={bw} height={BAR_H - 4}
                fill={outline ? 'transparent' : fill}
                fillOpacity={isSelf ? 0.95 : 0.35}
                stroke={isSelf ? '#fbbf24' : fill}
                strokeWidth={isSelf ? 2 : 1}
                strokeOpacity={isSelf ? 1 : 0.5}
                strokeDasharray={outline ? '3 3' : undefined}
                rx={2}>
                <title>{`分配块 #${s.id}${isSelf ? '(当前)' : ''}\n${Number(sus).toFixed(2)} ~ ${Number(sue).toFixed(2)} MHz · ${s.bandwidth} MHz`}</title>
              </rect>
              {isSelf && (
                <>
                  <text x={bx} y={rowY} fill="#fbbf24" fontSize={9} fontFamily="monospace" textAnchor="middle">
                    {Number(sus).toFixed(2)}
                  </text>
                  <text x={bx + bw} y={rowY} fill="#fbbf24" fontSize={9} fontFamily="monospace" textAnchor="middle">
                    {Number(sue).toFixed(2)}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* 创建预览块 */}
        {preview && preview.ue > preview.us && (() => {
          const ps = isUp ? preview.us : toDown(preview.us);
          const pe = isUp ? preview.ue : toDown(preview.ue);
          const bx = x(preview.us), bw = Math.max(2, x(preview.ue) - x(preview.us));
          return (
            <g pointerEvents="none">
              <rect x={bx} y={barY + 2} width={bw} height={BAR_H - 4}
                fill="#fbbf24" fillOpacity={0.35} stroke="#fbbf24" strokeWidth={1.5}
                strokeDasharray="5 3" rx={2} />
              <text x={bx} y={rowY} fill="#fbbf24" fontSize={9} fontFamily="monospace" textAnchor="middle">
                {ps.toFixed(2)}
              </text>
              <text x={bx + bw} y={rowY} fill="#fbbf24" fontSize={9} fontFamily="monospace" textAnchor="middle">
                {pe.toFixed(2)}
              </text>
            </g>
          );
        })()}
      </g>
    );
  };

  return (
    <div ref={ref} style={{ background: '#0a1626', border: '1px solid #16263d', borderRadius: 6, padding: '8px 10px 2px' }}>
      <svg width={width} height={totalH} style={{ display: 'block' }}>
        {renderRow(row1Y, true)}
        {renderRow(row2Y, false)}

        {/* 频标游标:起止竖线贯穿上下行 + 中间信息带 */}
        {marker && (() => {
          const y0 = row1Y + 2;
          const y1 = row2Y + 4 + BAR_H + 2;
          const xs = x(marker.us), xe = x(marker.ue);
          const midY = row1Y + ROW_H + LBL_H + 7;
          const bw = marker.ue - marker.us;
          const cu = (marker.us + marker.ue) / 2;
          const cd = (marker.ds + marker.de) / 2;
          const summary =
            `上行 ${marker.us.toFixed(2)}~${marker.ue.toFixed(2)}` +
            `  ⇅  下行 ${marker.ds.toFixed(2)}~${marker.de.toFixed(2)}` +
            `  ·  中心 U${cu.toFixed(2)} / D${cd.toFixed(2)}  ·  ${bw.toFixed(2)} MHz`;
          return (
            <g pointerEvents="none">
              <line x1={xs} y1={y0} x2={xs} y2={y1} stroke="#fbbf24" strokeWidth={1}
                strokeDasharray="2 2" strokeOpacity={0.85} />
              <line x1={xe} y1={y0} x2={xe} y2={y1} stroke="#fbbf24" strokeWidth={1}
                strokeDasharray="2 2" strokeOpacity={0.85} />
              {/* 游标端点小三角 */}
              <path d={`M ${xs - 4} ${y0 - 3} L ${xs + 4} ${y0 - 3} L ${xs} ${y0 + 3} Z`} fill="#fbbf24" />
              <path d={`M ${xe - 4} ${y0 - 3} L ${xe + 4} ${y0 - 3} L ${xe} ${y0 + 3} Z`} fill="#fbbf24" />
              {/* 中间信息带 */}
              <text x={Math.min(Math.max((xs + xe) / 2, 235), width - 235)} y={midY}
                fill="#fbbf24" fontSize={9.5} textAnchor="middle" fontFamily="monospace">
                {summary}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
