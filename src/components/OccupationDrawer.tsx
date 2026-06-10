import { useEffect, useState, useCallback } from 'react';
import {
  Drawer, Descriptions, Tag, Table, Badge,
  Button, Space, Popconfirm, Tooltip, message, Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, BranchesOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import {
  fetchFrequencyBlocks, deleteFrequencyBlock,
  fetchOccupationRecordsBySwitch, deleteOccupationRecord,
} from '@/api';
import { PERMISSIONS } from '@/utils/roleGuard';
import OccupationForm from './OccupationForm';
import OccupationRecordForm from './OccupationRecordForm';
import SpectrumChart from './SpectrumChart';
import DeliveryRecordList from './DeliveryRecordList';
import ChannelHierarchyView from './ChannelHierarchyView';
import type { Transponder, FrequencyBlock, OccupationRecord } from '@/types';
import { fmtFreq, fmtPolarization, fmtChannelLabel } from '@/utils/freqCalc';

function msToStr(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleString('zh-CN', { hour12: false });
}

const USAGE_COLOR: Record<string, string> = {
  出租: 'blue', 合作: 'green', 自用: 'purple', 禁用: 'error',
};

function planLabel(o: FrequencyBlock) {
  if (o.usageType === '禁用') return '禁用';
  if (o.partitionStatus === 'R') return o.usageType ?? '回收';
  return o.usageType ?? '划分';
}
function planColor(o: FrequencyBlock) {
  if (o.usageType === '禁用') return 'error';
  if (o.partitionStatus === 'R') return USAGE_COLOR[o.usageType ?? ''] ?? 'green';
  return USAGE_COLOR[o.usageType ?? ''] ?? 'blue';
}
function occLabel(o: OccupationRecord) {
  if (o.blockValid === 0) return '无效';
  if (o.usageType === '禁用') return '禁用';
  return o.usageType ?? '有效';
}
function occColor(o: OccupationRecord) {
  if (o.blockValid === 0) return 'default';
  if (o.usageType === '禁用') return 'error';
  return USAGE_COLOR[o.usageType ?? ''] ?? 'blue';
}

interface OccupationDrawerProps {
  open: boolean;
  transponder: Transponder | null;
  transponders?: Transponder[];
  onClose: () => void;
  onOccChange?: () => void;
}

export default function OccupationDrawer({
  open, transponder, transponders = [], onClose, onOccChange,
}: OccupationDrawerProps) {
  const { role, bumpDataVersion } = useStore();

  const [planningBlocks, setPlanningBlocks] = useState<FrequencyBlock[]>([]);
  const [occRecords, setOccRecords]         = useState<OccupationRecord[]>([]);

  const [planFormOpen, setPlanFormOpen]       = useState(false);
  const [planEditRecord, setPlanEditRecord]   = useState<FrequencyBlock | null>(null);
  const [occFormOpen, setOccFormOpen]         = useState(false);
  const [occEditRecord, setOccEditRecord]     = useState<OccupationRecord | null>(null);
  const [occInitPlan, setOccInitPlan]         = useState<FrequencyBlock | null>(null);

  const canManagePlan = role != null && PERMISSIONS.canManagePlanningBlocks(role);
  const canManageOcc  = role != null && PERMISSIONS.canManageOccupation(role);

  const reload = useCallback(() => {
    if (!transponder) return;
    fetchFrequencyBlocks(transponder.switchId).then(setPlanningBlocks).catch(console.error);
    fetchOccupationRecordsBySwitch(transponder.switchId).then(setOccRecords).catch(console.error);
  }, [transponder]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  function handlePlanFormSuccess() {
    reload(); onOccChange?.();
    message.success(planEditRecord ? '规划块已更新' : '规划块已新建');
  }
  function handleOccFormSuccess() {
    reload(); onOccChange?.();
    message.success(occEditRecord ? '占用记录已更新' : '占用记录已新建');
  }

  async function handleDeletePlan(id: number) {
    await deleteFrequencyBlock(id);
    bumpDataVersion(); reload(); onOccChange?.();
    message.success('规划块已删除');
  }
  async function handleDeleteOcc(id: number) {
    await deleteOccupationRecord(id);
    bumpDataVersion(); reload(); onOccChange?.();
    message.success('占用记录已删除');
  }

  // 打开「分配占用」表单（预选规划块）
  function openOccFormForPlan(plan: FrequencyBlock) {
    setOccEditRecord(null);
    setOccInitPlan(plan);
    setOccFormOpen(true);
  }
  function openOccFormNew() {
    setOccEditRecord(null);
    setOccInitPlan(null);
    setOccFormOpen(true);
  }

  // ── 规划块列 ──────────────────────────────────────────────────
  const planColumns: ColumnsType<FrequencyBlock> = [
    {
      title: '频率范围（上行）',
      render: (_, o) =>
        o.uplinkStartFreq != null
          ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {o.uplinkStartFreq.toFixed(3)} ~ {o.uplinkEndFreq?.toFixed(3)} MHz
            </span>
          : '—',
    },
    {
      title: '频率范围（下行）',
      render: (_, o) =>
        o.downlinkStartFreq != null
          ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {o.downlinkStartFreq.toFixed(3)} ~ {o.downlinkEndFreq?.toFixed(3)} MHz
            </span>
          : '—',
    },
    { title: '带宽', dataIndex: 'occupiedBandwidth', render: (v) => `${fmtFreq(v)} MHz`, width: 76 },
    {
      title: '用途',
      dataIndex: 'usageType',
      width: 72,
      render: (v) => v
        ? <Tag color={USAGE_COLOR[v] ?? 'default'} style={{ fontSize: 11 }}>{v}</Tag>
        : '—',
    },
    {
      title: '状态',
      render: (_, o) => <Tag color={planColor(o)}>{planLabel(o)}</Tag>,
      width: 68,
    },
    {
      title: '更新时间',
      width: 130,
      render: (_, o) => <div style={{ fontSize: 11, color: '#94a3b8' }}>{msToStr(o.statusUpdateTime)}</div>,
    },
    {
      title: '操作',
      width: canManageOcc ? 120 : (canManagePlan ? 80 : 0),
      render: (_, o) => (
        <Space size={2}>
          {/* 分频工程师：在该规划块上分配占用 */}
          {canManageOcc && (
            <Tooltip title="分配占用">
              <Button
                type="text" size="small" icon={<BranchesOutlined />}
                style={{ color: '#34d399' }}
                onClick={() => openOccFormForPlan(o)}
              />
            </Tooltip>
          )}
          {/* 网络规划工程师：编辑/删除规划块 */}
          {canManagePlan && (
            <>
              <Tooltip title="编辑">
                <Button type="text" size="small" icon={<EditOutlined />}
                  style={{ color: '#60a5fa' }}
                  onClick={() => { setPlanEditRecord(o); setPlanFormOpen(true); }}
                />
              </Tooltip>
              <Popconfirm title="确认删除该规划块？"
                onConfirm={() => handleDeletePlan(o.id)}
                okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
              >
                <Tooltip title="删除">
                  <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  // ── 占用记录列 ────────────────────────────────────────────────
  const occColumns: ColumnsType<OccupationRecord> = [
    {
      title: '频率范围（上行）',
      render: (_, o) =>
        o.uplinkStartFreq != null
          ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {o.uplinkStartFreq.toFixed(3)} ~ {o.uplinkEndFreq?.toFixed(3)} MHz
            </span>
          : '—',
    },
    {
      title: '频率范围（下行）',
      render: (_, o) =>
        o.downlinkStartFreq != null
          ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {o.downlinkStartFreq.toFixed(3)} ~ {o.downlinkEndFreq?.toFixed(3)} MHz
            </span>
          : '—',
    },
    { title: '带宽', dataIndex: 'occupiedBandwidth', render: (v) => `${fmtFreq(v)} MHz`, width: 76 },
    {
      title: '规划块',
      dataIndex: 'planningBlockCode',
      width: 110,
      ellipsis: true,
      render: (v) => v
        ? <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#60a5fa' }}>{v}</span>
        : <span style={{ color: '#475569' }}>—</span>,
    },
    { title: '状态', render: (_, o) => <Tag color={occColor(o)}>{occLabel(o)}</Tag>, width: 68 },
    { title: '用户', dataIndex: 'remarkUser', width: 90, render: (v) => v ?? '—' },
    {
      title: '更新时间',
      width: 130,
      render: (_, o) => <div style={{ fontSize: 11, color: '#94a3b8' }}>{msToStr(o.statusUpdateTime)}</div>,
    },
    ...(canManageOcc
      ? [{
          title: '操作', width: 80,
          render: (_: unknown, o: OccupationRecord) => (
            <Space size={2}>
              <Tooltip title="编辑">
                <Button type="text" size="small" icon={<EditOutlined />}
                  style={{ color: '#60a5fa' }}
                  onClick={() => { setOccEditRecord(o); setOccInitPlan(null); setOccFormOpen(true); }}
                />
              </Tooltip>
              <Popconfirm title="确认删除该占用记录？"
                onConfirm={() => handleDeleteOcc(o.id)}
                okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
              >
                <Tooltip title="删除">
                  <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                </Tooltip>
              </Popconfirm>
            </Space>
          ),
        } as ColumnsType<OccupationRecord>[number]]
      : []),
  ];

  const activePlanBlocks = planningBlocks.filter((b) => b.partitionStatus === 'P');
  const allTransponders  = transponders.length > 0 ? transponders : (transponder ? [transponder] : []);

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{transponder ? `通道详情 — ${fmtChannelLabel(transponder)}` : '通道详情'}</span>
            <Space style={{ marginRight: 32 }}>
              {canManagePlan && transponder && (
                <Button type="default" size="small" icon={<PlusOutlined />}
                  style={{ borderColor: '#2563eb', color: '#60a5fa' }}
                  onClick={() => { setPlanEditRecord(null); setPlanFormOpen(true); }}
                >
                  新建规划块
                </Button>
              )}
              {canManageOcc && transponder && (
                <Button type="primary" size="small" icon={<PlusOutlined />}
                  onClick={openOccFormNew}
                >
                  新建占用记录
                </Button>
              )}
            </Space>
          </div>
        }
        open={open}
        onClose={onClose}
        size="large"
        styles={{
          body:   { background: '#0f172a', padding: 20 },
          header: { background: '#1e293b', borderBottom: '1px solid #334155', color: '#e2e8f0' },
        }}
      >
        {transponder && (
          <>
            {/* 通道基本信息 */}
            <Descriptions size="small" column={2}
              labelStyle={{ color: '#64748b' }}
              contentStyle={{ color: '#e2e8f0' }}
              style={{ marginBottom: 20 }}
            >
              <Descriptions.Item label="开关代码">{transponder.switchCode}</Descriptions.Item>
              <Descriptions.Item label="开关状态">
                <Badge status={transponder.switchStatus === 1 ? 'success' : 'error'}
                  text={transponder.switchStatus === 1 ? '开' : '关'} />
              </Descriptions.Item>
              <Descriptions.Item label="类型">{transponder.switchType}</Descriptions.Item>
              <Descriptions.Item label="频段">
                <Tag color={transponder.band === 'Ku' ? 'blue' : transponder.band === 'EKu' ? 'purple' : 'green'}>
                  {transponder.band}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="极化">{fmtPolarization(transponder.polarization)}</Descriptions.Item>
              <Descriptions.Item label="天线">{transponder.antennaName ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="上行频率">
                {transponder.rxStartFreq != null
                  ? `${transponder.rxStartFreq} ~ ${transponder.rxEndFreq} MHz` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="下行频率">
                {transponder.txStartFreq != null
                  ? `${transponder.txStartFreq} ~ ${transponder.txEndFreq} MHz` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="通道带宽">
                {transponder.channelBw != null ? `${transponder.channelBw} MHz` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="TWT">{transponder.twtValidStatusCode ?? '—'}</Descriptions.Item>
            </Descriptions>

            {/* 频谱图：通道级，展示规划块 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                通道频谱（通道规划状态）
              </div>
              <SpectrumChart
                rxStartFreq={transponder.rxStartFreq}
                rxEndFreq={transponder.rxEndFreq}
                txStartFreq={transponder.txStartFreq}
                txEndFreq={transponder.txEndFreq}
                channelBw={transponder.channelBw}
                occupations={planningBlocks}
                transponderName={fmtChannelLabel(transponder)}
                switchOff={transponder.switchStatus !== 1}
              />
            </div>

            {/* 双层数据 */}
            <Tabs
              defaultActiveKey="planning"
              size="small"
              style={{ color: '#94a3b8' }}
              items={[
                {
                  key: 'planning',
                  label: (
                    <span>
                      通道规划状态
                      <Badge count={planningBlocks.length}
                        style={{ marginLeft: 6, backgroundColor: '#2563eb' }} showZero />
                    </span>
                  ),
                  children: (
                    <Table
                      size="small"
                      columns={planColumns}
                      dataSource={planningBlocks}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: true }}
                      style={{ background: '#1e293b', borderRadius: 8 }}
                      locale={{
                        emptyText: (
                          <span style={{ color: '#475569', fontSize: 12 }}>
                            暂无规划块（由网络规划工程师创建）
                          </span>
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: 'occupation',
                  label: (
                    <span>
                      分配块管理
                      <Badge count={occRecords.length}
                        style={{ marginLeft: 6, backgroundColor: '#16a34a' }} showZero />
                    </span>
                  ),
                  children: (
                    <Table
                      size="small"
                      columns={occColumns}
                      dataSource={occRecords}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: true }}
                      style={{ background: '#1e293b', borderRadius: 8 }}
                      expandable={{
                        expandedRowRender: (record) => (
                          <DeliveryRecordList
                            allocationBlock={record}
                            canManage={canManageOcc}
                          />
                        ),
                        rowExpandable: () => true,
                        expandedRowClassName: () => 'delivery-expanded-row',
                      }}
                      locale={{
                        emptyText: (
                          <span style={{ color: '#475569', fontSize: 12 }}>
                            暂无分配块记录（由分频工程师在规划块上创建）
                          </span>
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: 'hierarchy',
                  label: '可视化总览',
                  children: (
                    <ChannelHierarchyView
                      transponder={transponder}
                      planningBlocks={planningBlocks}
                      occRecords={occRecords}
                      canManagePlan={canManagePlan}
                      canManageOcc={canManageOcc}
                      onEditPlan={(plan) => { setPlanEditRecord(plan); setPlanFormOpen(true); }}
                      onDeletePlan={handleDeletePlan}
                      onCreateAlloc={openOccFormForPlan}
                      onEditAlloc={(occ) => { setOccEditRecord(occ); setOccInitPlan(null); setOccFormOpen(true); }}
                      onDeleteAlloc={handleDeleteOcc}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>

      {/* 规划块表单（网络规划工程师） */}
      {transponder && (
        <OccupationForm
          open={planFormOpen}
          onClose={() => setPlanFormOpen(false)}
          onSuccess={handlePlanFormSuccess}
          editRecord={planEditRecord}
          transponders={allTransponders}
          initTransponder={planEditRecord ? null : transponder}
        />
      )}

      {/* 占用记录表单（分频工程师，以规划块为分配对象） */}
      {transponder && (
        <OccupationRecordForm
          open={occFormOpen}
          onClose={() => { setOccFormOpen(false); setOccInitPlan(null); }}
          onSuccess={handleOccFormSuccess}
          editRecord={occEditRecord}
          transponders={allTransponders}
          planningBlocks={activePlanBlocks}
          initPlanningBlock={occInitPlan}
        />
      )}
    </>
  );
}

// ── 占用统计条（带宽利用率摘要，规划块维度） ──────────────────
export function OccSummaryBar({ occs, channelBw }: { occs: FrequencyBlock[]; channelBw: number | null }) {
  if (channelBw == null) return null;

  const totalOcc  = occs.reduce((s, o) => s + o.occupiedBandwidth, 0);
  const usedRatio = Math.min(1, totalOcc / channelBw);

  const STATUS_FILL: Record<string, string> = { P: '#1677ff', R: '#52c41a', 禁用: '#ff4d4f' };
  const byStatus = occs.reduce<Record<string, number>>((acc, o) => {
    const key = o.usageType === '禁用' ? '禁用' : o.partitionStatus;
    acc[key] = (acc[key] ?? 0) + o.occupiedBandwidth;
    return acc;
  }, {});
  const labelMap: Record<string, string> = { P: '划分', R: '回收', 禁用: '禁用' };

  return (
    <div style={{
      background: '#1e293b', borderRadius: 8, padding: '10px 14px',
      marginBottom: 20, border: '1px solid #334155',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>频段利用率</span>
        <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
          {totalOcc.toFixed(1)} / {channelBw} MHz（{(usedRatio * 100).toFixed(1)}%）
        </span>
      </div>
      <div style={{
        height: 10, background: '#0f172a', borderRadius: 5, overflow: 'hidden',
        position: 'relative', marginBottom: 8,
      }}>
        {occs.map((o, i) => {
          const left  = Math.max(0, Math.min(100, (o.frequencyOffset / channelBw) * 100));
          const width = Math.max(1, Math.min(100 - left, (o.occupiedBandwidth / channelBw) * 100));
          const key   = o.usageType === '禁用' ? '禁用' : o.partitionStatus;
          return (
            <div key={i} style={{
              position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%',
              background: STATUS_FILL[key] ?? '#475569', opacity: 0.9,
            }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {Object.entries(byStatus).map(([key, bw]) => (
          <span key={key} style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_FILL[key] ?? '#475569', display: 'inline-block' }} />
            {labelMap[key] ?? key}：{bw.toFixed(1)} MHz
          </span>
        ))}
        {occs.length === 0 && <span style={{ fontSize: 11, color: '#475569' }}>暂无规划记录</span>}
        <span style={{ fontSize: 11, color: '#334155', marginLeft: 'auto' }}>
          剩余空闲：{(channelBw - totalOcc).toFixed(1)} MHz
        </span>
      </div>
    </div>
  );
}
