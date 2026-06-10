/**
 * ChannelHierarchyView
 * 双层可视化：通道 → 规划块 → 分配块
 *
 * 视觉规则（两层统一）：
 *   P 状态 → 实线边框 + 有色填充 + 显示用途（出租/合作/自用）
 *   R 状态 → 虚线边框 + 透明填充 + 显示"回收"
 *   N 状态 → 不显示
 */

import { useState } from 'react';
import { Tag, Tooltip, Popover, Button, Space, Popconfirm, message } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Transponder, FrequencyBlock, OccupationRecord } from '@/types';

interface Props {
  transponder: Transponder;
  planningBlocks: FrequencyBlock[];
  occRecords: OccupationRecord[];
  canManagePlan?: boolean;
  canManageOcc?: boolean;
  onEditPlan?: (plan: FrequencyBlock) => void;
  onDeletePlan?: (id: number) => Promise<void>;
  onCreateAlloc?: (plan: FrequencyBlock) => void;
  onEditAlloc?: (occ: OccupationRecord) => void;
  onDeleteAlloc?: (id: number) => Promise<void>;
}

const DARK = {
  card: '#1e293b', border: '#334155', text: '#e2e8f0', muted: '#64748b',
};

// usageType → 颜色（实线块）
const USAGE_COLOR: Record<string, string> = {
  出租: '#2563eb', 合作: '#16a34a', 自用: '#7c3aed', 禁用: '#dc2626',
};
const USAGE_LIGHT: Record<string, string> = {
  出租: '#60a5fa', 合作: '#4ade80', 自用: '#c084fc', 禁用: '#f87171',
};
const USAGE_BG: Record<string, string> = {
  出租: '#1e3a8a44', 合作: '#14532d44', 自用: '#3b076444', 禁用: '#450a0a44',
};
const USAGE_TAG: Record<string, string> = {
  出租: 'blue', 合作: 'success', 自用: 'purple', 禁用: 'error',
};

function usageLabel(usageType: string | null | undefined): string {
  return usageType ?? '划分';
}

function getColor(usageType: string | null | undefined, key: Record<string, string>, fallback: string) {
  return key[usageType ?? ''] ?? fallback;
}

function fmtMHz(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}
function pct(offset: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (offset / total) * 100));
}
function wPct(bw: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0.5, Math.min(100, (bw / total) * 100));
}

// ─── 分配块 Popover 详情 ──────────────────────────────────────
function AllocDetail({
  occ, canManage, onEdit, onDelete, close,
}: {
  occ: OccupationRecord;
  canManage?: boolean;
  onEdit?: (occ: OccupationRecord) => void;
  onDelete?: (id: number) => Promise<void>;
  close: () => void;
}) {
  const isR = occ.partitionStatus === 'R';
  const freqLine = occ.uplinkStartFreq != null
    ? `${occ.uplinkStartFreq.toFixed(2)} ~ ${occ.uplinkEndFreq?.toFixed(2)} MHz`
    : `偏移 ${occ.frequencyOffset >= 0 ? '+' : ''}${occ.frequencyOffset} MHz`;

  return (
    <div style={{ width: 240, fontSize: 12 }}>
      <div style={{ marginBottom: 8, fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', wordBreak: 'break-all' }}>
        {occ.occupationCode ?? `ID ${occ.id}`}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {occ.usageType && !isR && (
          <Tag color={USAGE_TAG[occ.usageType] ?? 'default'} style={{ margin: 0 }}>{occ.usageType}</Tag>
        )}
        <Tag color={isR ? 'default' : (USAGE_TAG[occ.usageType ?? ''] ?? 'blue')} style={{ margin: 0 }}>
          {isR ? 'R · 回收' : `P · ${usageLabel(occ.usageType)}`}
        </Tag>
      </div>
      <div style={{ color: '#cbd5e1', marginBottom: 4 }}>上行：{freqLine}</div>
      <div style={{ color: '#cbd5e1', marginBottom: 4 }}>带宽：{occ.occupiedBandwidth} MHz</div>
      {occ.remarkUser && <div style={{ color: '#94a3b8', marginBottom: 4 }}>用户：{occ.remarkUser}</div>}
      {occ.planningBlockCode && (
        <div style={{ color: '#475569', fontSize: 11, marginBottom: 8, wordBreak: 'break-all' }}>
          归属规划块：{occ.planningBlockCode}
        </div>
      )}
      {canManage && (
        <Space style={{ marginTop: 4 }}>
          <Button size="small" type="primary" icon={<EditOutlined />}
            onClick={() => { close(); onEdit?.(occ); }}>
            编辑
          </Button>
          <Popconfirm title="确认删除该分配块？"
            onConfirm={async () => { try { await onDelete?.(occ.id); close(); } catch { message.error('删除失败'); } }}
            okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )}
    </div>
  );
}

// ─── 分配块气泡 ────────────────────────────────────────────────
function AllocBlock({
  occ, planBw, planOffset, canManage, onEdit, onDelete,
}: {
  occ: OccupationRecord; planBw: number; planOffset: number;
  canManage?: boolean;
  onEdit?: (occ: OccupationRecord) => void;
  onDelete?: (id: number) => Promise<void>;
}) {
  const [popOpen, setPopOpen] = useState(false);

  const isR = occ.partitionStatus === 'R';
  const relOff = occ.frequencyOffset - planOffset;
  const left  = pct(relOff, planBw);
  const width = wPct(occ.occupiedBandwidth, planBw);

  const borderColor = isR
    ? '#475569'
    : getColor(occ.usageType, USAGE_LIGHT, '#60a5fa');
  const bgColor = isR
    ? 'transparent'
    : getColor(occ.usageType, USAGE_BG, '#1e3a8a44');
  const textColor = isR
    ? '#475569'
    : getColor(occ.usageType, USAGE_LIGHT, '#60a5fa');
  const label = isR ? '回收' : usageLabel(occ.usageType);

  const inner = (
    <div
      onClick={() => setPopOpen(true)}
      style={{
        position: 'absolute',
        left: `${left}%`, width: `${width}%`, height: '100%',
        background: bgColor,
        border: `1px ${isR ? 'dashed' : 'solid'} ${borderColor}`,
        borderRadius: 3,
        cursor: canManage ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', boxSizing: 'border-box', transition: 'filter 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.5)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.filter = ''; }}
    >
      <span style={{
        fontSize: 9, color: textColor, fontWeight: 600,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px',
      }}>
        {label}
      </span>
    </div>
  );

  if (!canManage) {
    return (
      <Tooltip title={
        <div style={{ fontSize: 11 }}>
          <div><b>{occ.occupationCode ?? `ID ${occ.id}`}</b></div>
          <div>{occ.uplinkStartFreq != null
            ? `${occ.uplinkStartFreq.toFixed(1)}~${occ.uplinkEndFreq?.toFixed(1)} MHz`
            : `${occ.occupiedBandwidth} MHz`}</div>
          <div>带宽：{occ.occupiedBandwidth} MHz</div>
          <div>状态：{isR ? 'R · 回收' : `P · ${usageLabel(occ.usageType)}`}</div>
        </div>
      }>{inner}</Tooltip>
    );
  }

  return (
    <Popover
      open={popOpen} onOpenChange={setPopOpen}
      trigger="click" placement="top" arrow={false}
      content={
        <AllocDetail occ={occ} canManage={canManage}
          onEdit={onEdit} onDelete={onDelete} close={() => setPopOpen(false)} />
      }
      styles={{ body: { background: '#1e293b', padding: '12px', border: '1px solid #334155', borderRadius: 6 } }}
    >
      {inner}
    </Popover>
  );
}

// ─── 规划块行 ──────────────────────────────────────────────────
function PlanRow({
  block, channelBw, allocs,
  canManagePlan, canManageOcc,
  onEditPlan, onDeletePlan, onCreateAlloc, onEditAlloc, onDeleteAlloc,
}: {
  block: FrequencyBlock; channelBw: number; allocs: OccupationRecord[];
  canManagePlan?: boolean; canManageOcc?: boolean;
  onEditPlan?: (p: FrequencyBlock) => void;
  onDeletePlan?: (id: number) => Promise<void>;
  onCreateAlloc?: (p: FrequencyBlock) => void;
  onEditAlloc?: (o: OccupationRecord) => void;
  onDeleteAlloc?: (id: number) => Promise<void>;
}) {
  const [hovered, setHovered] = useState(false);

  const isP = block.partitionStatus === 'P';
  const left  = pct(block.frequencyOffset, channelBw);
  const width = wPct(block.occupiedBandwidth, channelBw);

  const borderColor = isP
    ? getColor(block.usageType, USAGE_LIGHT, '#3b82f6')
    : '#475569';
  const bgColor = isP
    ? getColor(block.usageType, USAGE_BG, '#1e3a8a44')
    : 'transparent';
  const textColor = isP
    ? getColor(block.usageType, USAGE_LIGHT, '#60a5fa')
    : '#475569';

  const hasActions = (canManagePlan || canManageOcc) && isP;

  // 分配块中过滤掉 N，R 保留（虚线显示）
  const visibleAllocs = allocs.filter((o) => o.partitionStatus !== 'N' && o.blockValid !== 0);

  return (
    <div style={{ marginBottom: 14 }}>
      {/* 规划块标签行 */}
      <div
        style={{ position: 'relative', height: 32, marginBottom: 5 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%',
          transform: 'translateY(-50%)', height: 2, background: '#1e293b', borderRadius: 1,
        }} />
        <Tooltip
          title={hasActions ? undefined : (
            <div style={{ fontSize: 11 }}>
              <div><b>{block.frequencyBlockCode2 ?? block.frequencyBlockCode ?? `ID ${block.id}`}</b></div>
              <div>{block.uplinkStartFreq != null
                ? `上行 ${block.uplinkStartFreq.toFixed(1)}~${block.uplinkEndFreq?.toFixed(1)} MHz`
                : `偏移 +${block.frequencyOffset} MHz`}</div>
              <div>带宽：{block.occupiedBandwidth} MHz</div>
              <div>用途：{block.usageType ?? '—'}</div>
              <div>状态：{isP ? 'P · 划分' : 'R · 回收'}</div>
            </div>
          )}
          mouseEnterDelay={0.3}
        >
          <div style={{
            position: 'absolute',
            left: `${left}%`, width: `${width}%`, height: '100%',
            background: bgColor,
            border: `1.5px ${isP ? 'solid' : 'dashed'} ${borderColor}`,
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxSizing: 'border-box', overflow: 'hidden', padding: '0 4px',
            transition: 'filter 0.15s',
          }}>
            <span style={{
              fontSize: 10, color: textColor, fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1,
            }}>
              {isP
                ? `${block.occupiedBandwidth}MHz${block.usageType ? ` · ${block.usageType}` : ''}`
                : `${block.occupiedBandwidth}MHz · 回收`}
            </span>

            {hovered && hasActions && (
              <Space size={2} style={{ flexShrink: 0, marginLeft: 4 }}>
                {canManagePlan && (
                  <>
                    <Tooltip title="编辑规划块" mouseEnterDelay={0.1}>
                      <Button type="text" size="small"
                        icon={<EditOutlined style={{ fontSize: 11 }} />}
                        style={{ color: '#60a5fa', padding: '0 3px', height: 20, minWidth: 20 }}
                        onClick={(e) => { e.stopPropagation(); onEditPlan?.(block); }}
                      />
                    </Tooltip>
                    <Popconfirm title="确认删除该规划块？"
                      onConfirm={async () => { await onDeletePlan?.(block.id); }}
                      okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                      <Tooltip title="删除规划块" mouseEnterDelay={0.1}>
                        <Button type="text" size="small" danger
                          icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                          style={{ padding: '0 3px', height: 20, minWidth: 20 }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </>
                )}
                {canManageOcc && (
                  <Tooltip title="在此规划块上创建分配块" mouseEnterDelay={0.1}>
                    <Button type="text" size="small"
                      icon={<PlusOutlined style={{ fontSize: 11 }} />}
                      style={{ color: '#34d399', padding: '0 3px', height: 20, minWidth: 20 }}
                      onClick={(e) => { e.stopPropagation(); onCreateAlloc?.(block); }}
                    />
                  </Tooltip>
                )}
              </Space>
            )}
          </div>
        </Tooltip>
      </div>

      {/* 分配块行（以规划块为坐标系） */}
      {visibleAllocs.length > 0 ? (
        <div style={{ paddingLeft: `${left}%`, paddingRight: `${100 - left - width}%` }}>
          <div style={{ position: 'relative', height: 24 }}>
            {visibleAllocs.map((occ) => (
              <AllocBlock
                key={occ.id}
                occ={occ}
                planBw={block.occupiedBandwidth}
                planOffset={block.frequencyOffset}
                canManage={canManageOcc}
                onEdit={onEditAlloc}
                onDelete={onDeleteAlloc}
              />
            ))}
          </div>
        </div>
      ) : isP ? (
        <div style={{ paddingLeft: `${left}%`, paddingRight: `${100 - left - width}%` }}>
          <div style={{
            height: 18, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 10,
          }}>
            <span
              style={{ cursor: canManageOcc ? 'pointer' : 'default', color: '#334155' }}
              onClick={() => canManageOcc && onCreateAlloc?.(block)}
            >
              {canManageOcc ? '暂无分配块，点击 + 新建' : '暂无分配块'}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
export default function ChannelHierarchyView({
  transponder, planningBlocks, occRecords,
  canManagePlan, canManageOcc,
  onEditPlan, onDeletePlan, onCreateAlloc, onEditAlloc, onDeleteAlloc,
}: Props) {
  const channelBw = transponder.channelBw ?? 0;

  if (channelBw <= 0) {
    return <div style={{ color: DARK.muted, fontSize: 12, padding: 16 }}>该通道暂无频率数据</div>;
  }

  // 过滤掉 N 状态的规划块
  const visiblePlans = planningBlocks.filter((b) => b.partitionStatus !== 'N');

  // 分配块按规划块 id 分组，过滤掉 N 和 blockValid=0
  const allocsByPlan = new Map<number, OccupationRecord[]>();
  for (const occ of occRecords) {
    if (occ.partitionStatus === 'N' || occ.blockValid === 0) continue;
    const pid = occ.planningBlockId ?? -1;
    if (!allocsByPlan.has(pid)) allocsByPlan.set(pid, []);
    allocsByPlan.get(pid)!.push(occ);
  }

  // 统计（只统计可见的）
  const visibleAllocs = occRecords.filter((o) => o.partitionStatus !== 'N' && o.blockValid !== 0);
  const totalAllocBw  = visibleAllocs.reduce((s, o) => s + o.occupiedBandwidth, 0);

  return (
    <div>
      {/* 图例 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14, fontSize: 11, alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8' }}>
          <span style={{ width: 22, height: 10, border: '1.5px solid #60a5fa', borderRadius: 2,
            background: '#1e3a8a44', display: 'inline-block' }} />
          P · 划分（实线，颜色=用途）
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8' }}>
          <span style={{ width: 22, height: 10, border: '1.5px dashed #475569', borderRadius: 2,
            background: 'transparent', display: 'inline-block' }} />
          R · 回收（虚线）
        </span>
        <span style={{ marginLeft: 'auto', color: DARK.muted, fontSize: 10 }}>
          规划块 <b style={{ color: DARK.text }}>{visiblePlans.filter((b) => b.partitionStatus === 'P').length}</b>P +
          <b style={{ color: DARK.text }}> {visiblePlans.filter((b) => b.partitionStatus === 'R').length}</b>R ·
          分配块 <b style={{ color: DARK.text }}>{visibleAllocs.length}</b> 个 ·
          已分配 <b style={{ color: DARK.text }}>{fmtMHz(totalAllocBw)}</b> MHz
        </span>
      </div>

      {/* usageType 颜色速查 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 10, flexWrap: 'wrap' }}>
        {Object.entries(USAGE_LIGHT).map(([k, c]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
            <span style={{ width: 8, height: 8, borderRadius: 1, background: c, display: 'inline-block' }} />
            {k}
          </span>
        ))}
      </div>

      {/* 通道频率尺 */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: DARK.muted, marginBottom: 4 }}>
        <span>{transponder.rxStartFreq != null ? `${transponder.rxStartFreq} MHz` : '—'}</span>
        <span style={{ color: '#475569' }}>↑ 上行（{fmtMHz(channelBw)} MHz）</span>
        <span>{transponder.rxEndFreq != null ? `${transponder.rxEndFreq} MHz` : '—'}</span>
      </div>
      {/* 通道总览条 */}
      <div style={{
        position: 'relative', height: 6, background: '#0f172a',
        borderRadius: 3, marginBottom: 20, overflow: 'hidden', border: '1px solid #1e293b',
      }}>
        {visiblePlans.map((b) => (
          <div key={b.id} style={{
            position: 'absolute',
            left: `${pct(b.frequencyOffset, channelBw)}%`,
            width: `${wPct(b.occupiedBandwidth, channelBw)}%`,
            height: '100%',
            background: b.partitionStatus === 'P'
              ? getColor(b.usageType, USAGE_COLOR, '#2563eb')
              : '#334155',
            opacity: b.partitionStatus === 'P' ? 0.6 : 0.3,
          }} />
        ))}
      </div>

      {/* 层级说明 */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 10, fontSize: 11, color: DARK.muted }}>
        <span>上层：规划块（通道规划状态）{(canManagePlan || canManageOcc) ? ' — hover 显示操作' : ''}</span>
        <span>下层：分配块（通道分配状态）{canManageOcc ? ' — 点击编辑' : ''}</span>
      </div>

      {/* 规划块 + 分配块 */}
      {visiblePlans.length === 0 ? (
        <div style={{ color: DARK.muted, fontSize: 12, padding: '12px 0' }}>暂无规划块</div>
      ) : (
        visiblePlans.map((b) => (
          <PlanRow
            key={b.id}
            block={b}
            channelBw={channelBw}
            allocs={allocsByPlan.get(b.id) ?? []}
            canManagePlan={canManagePlan}
            canManageOcc={canManageOcc}
            onEditPlan={onEditPlan}
            onDeletePlan={onDeletePlan}
            onCreateAlloc={onCreateAlloc}
            onEditAlloc={onEditAlloc}
            onDeleteAlloc={onDeleteAlloc}
          />
        ))
      )}

      {/* 分配块用途汇总 */}
      {visibleAllocs.length > 0 && (
        <div style={{
          marginTop: 16, padding: '8px 12px',
          background: DARK.card, border: `1px solid ${DARK.border}`,
          borderRadius: 6, fontSize: 11,
        }}>
          <div style={{ color: DARK.muted, marginBottom: 6 }}>分配块汇总</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(
              visibleAllocs.reduce<Record<string, number>>((acc, o) => {
                const k = o.partitionStatus === 'R' ? 'R · 回收' : (o.usageType ?? '划分');
                acc[k] = (acc[k] ?? 0) + o.occupiedBandwidth;
                return acc;
              }, {}),
            ).map(([k, bw]) => (
              <Tag key={k}
                color={k === 'R · 回收' ? 'default'
                  : k === '出租' ? 'blue' : k === '合作' ? 'success'
                  : k === '自用' ? 'purple' : k === '禁用' ? 'error' : 'default'}>
                {k}：{fmtMHz(bw)} MHz
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
