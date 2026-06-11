/**
 * 频率分配 — 核心页面
 * 双层车道图:规划层(基底,半透明) + 分配层(实际占用,嵌于规划范围内)。
 * 关键规则的界面表征:
 *   1. 分配必须基于规划 — 新建分配从点击规划块发起,空隙可视化可点选,
 *      频率范围被锁在规划块内并实时预览、重叠告警;
 *   2. 占用/释放 与 有效/无效 互相独立 — 颜色表示占用,虚线表示结构无效;
 *   3. 交付记录引用分配块代码 — 块详情含频谱上下文图 + 占用时间线,
 *      并可直接登记占用/释放。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Card, Space, Select, Spin, Drawer, Descriptions, Button, Modal, Form,
  InputNumber, Input, message, Tag, Popconfirm, Typography, Radio, Alert,
  Segmented, Progress, Tooltip, Divider,
} from 'antd';
import { AimOutlined, SaveOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import {
  fetchChannels, fetchPlanningBlocks, fetchAllocationBlocks,
  updateAllocationBlock, deleteAllocationBlock,
  fetchDeliveryRecordsOfBlock, fetchCarrierUsageRecordsOfBlock,
  createDeliveryRecord, fetchContracts, createCarrierUsageRecord,
} from '@/api';
import type {
  Channel, PlanningBlock, AllocationBlock, Contract, DeliveryRecord, CarrierUsageRecord,
} from '@/types';
import {
  buildLanes, USAGE_COLORS, allocStatusText, fmtRange, beamNameMap, beamLabel,
} from '@/utils/freq';
import FreqLaneBoard, { LaneLegend } from '@/components/FreqLaneBoard';
import AllocationContextViz from '@/components/AllocationContextViz';
import AllocationEditorModal from '@/components/AllocationEditorModal';
import OccupancyTimeline from '@/components/OccupancyTimeline';

const cardStyle = { background: '#0c1a2e', border: '1px solid #1e3a5f' };

type OccFilter = 'all' | 'contract' | 'carrier' | 'idle' | 'invalid';

const occMatch = (a: AllocationBlock, f: OccFilter): boolean => {
  switch (f) {
    case 'contract': return (a.contractBalance ?? 0) > 0;
    case 'carrier': return (a.carrierBalance ?? 0) > 0;
    case 'idle': return (a.contractBalance ?? 0) <= 0 && (a.carrierBalance ?? 0) <= 0 && a.isValid === 1;
    case 'invalid': return a.isValid === 0;
    default: return true;
  }
};

export default function FreqAllocation() {
  const { selectedSatelliteId, dataVersion, bumpDataVersion } = useStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [plans, setPlans] = useState<PlanningBlock[]>([]);
  const [allocs, setAllocs] = useState<AllocationBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [laneFilter, setLaneFilter] = useState<string | undefined>();
  const [occFilter, setOccFilter] = useState<OccFilter>('all');

  // 选中分配块 → 详情抽屉(含频谱上下文 + 时间线 + 直接编辑)
  const [sel, setSel] = useState<AllocationBlock | null>(null);
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [usageRecords, setUsageRecords] = useState<CarrierUsageRecord[]>([]);
  const [editForm] = Form.useForm();
  const editUs = Form.useWatch('uplinkStartFreq', editForm);
  const editUe = Form.useWatch('uplinkEndFreq', editForm);

  // 点击规划块 → 在此规划内新建分配(共享弹窗)
  const [planSel, setPlanSel] = useState<PlanningBlock | null>(null);

  // 登记交付(占用/释放)
  const [dlvOpen, setDlvOpen] = useState(false);
  const [dlvForm] = Form.useForm();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const dlvKind = Form.useWatch('kind', dlvForm);

  useEffect(() => {
    if (!selectedSatelliteId) return;
    setLoading(true);
    Promise.all([
      fetchChannels(selectedSatelliteId),
      fetchPlanningBlocks(selectedSatelliteId),
      fetchAllocationBlocks(selectedSatelliteId),
    ])
      .then(([cs, ps, as_]) => { setChannels(cs); setPlans(ps); setAllocs(as_); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSatelliteId, dataVersion]);

  const filteredAllocs = useMemo(
    () => (occFilter === 'all' ? allocs : allocs.filter((a) => occMatch(a, occFilter))),
    [allocs, occFilter]);

  const lanes = useMemo(() => buildLanes(channels, plans, filteredAllocs), [channels, plans, filteredAllocs]);
  const visibleLanes = laneFilter ? lanes.filter((l) => l.key === laneFilter) : lanes;

  const occupiedCount = allocs.filter((a) => (a.contractBalance ?? 0) > 0 || (a.carrierBalance ?? 0) > 0).length;

  // ── 详情抽屉派生数据 ──
  const selPlanning = useMemo(
    () => (sel?.planningBlockId != null ? plans.find((p) => p.id === sel.planningBlockId) ?? null : null),
    [sel, plans]);
  const selSiblings = useMemo(
    () => (sel?.planningBlockId != null ? allocs.filter((a) => a.planningBlockId === sel.planningBlockId) : []),
    [sel, allocs]);
  const planUtil = useMemo(() => {
    if (!selPlanning?.bandwidth) return null;
    const planned = Number(selPlanning.bandwidth);
    const allocated = selSiblings.filter((s) => s.isValid === 1)
      .reduce((s, a) => s + Number(a.bandwidth ?? 0), 0);
    const occupied = selSiblings
      .filter((s) => (s.contractBalance ?? 0) > 0 || (s.carrierBalance ?? 0) > 0)
      .reduce((s, a) => s + Number(a.bandwidth ?? 0), 0);
    return { planned, allocated, occupied };
  }, [selPlanning, selSiblings]);

  // ── 创建弹窗派生数据 ──
  const createSiblings = useMemo(
    () => (planSel ? allocs.filter((a) => a.planningBlockId === planSel.id) : []),
    [planSel, allocs]);

  // 波束代号 → 中文波束名(取自通道组清单)
  const beamNames = useMemo(() => beamNameMap(channels), [channels]);

  const selOccupied = !!sel && ((sel.contractBalance ?? 0) > 0 || (sel.carrierBalance ?? 0) > 0);
  // 编辑预览(与当前范围不同时显示金色虚线预览块)
  const editPreview = useMemo(() => {
    if (!sel || editUs == null || editUe == null || editUe <= editUs) return null;
    if (Math.abs(editUs - Number(sel.uplinkStartFreq)) < 0.001
        && Math.abs(editUe - Number(sel.uplinkEndFreq)) < 0.001) return null;
    return { us: editUs, ue: editUe };
  }, [sel, editUs, editUe]);
  // 编辑重叠检测(排除自身)
  const editOverlapped = useMemo(() => {
    if (!editPreview || !sel) return [];
    return selSiblings.filter((s) => s.id !== sel.id
      && s.uplinkStartFreq != null && s.uplinkEndFreq != null
      && Number(s.uplinkStartFreq) < editPreview.ue - 0.001
      && editPreview.us + 0.001 < Number(s.uplinkEndFreq));
  }, [editPreview, sel, selSiblings]);

  const openAllocDetail = async (a: AllocationBlock) => {
    setSel(a);
    editForm.setFieldsValue({ uplinkStartFreq: a.uplinkStartFreq, uplinkEndFreq: a.uplinkEndFreq });
    try {
      const [ds, us] = await Promise.all([
        fetchDeliveryRecordsOfBlock(a.id),
        fetchCarrierUsageRecordsOfBlock(a.id),
      ]);
      setRecords(ds); setUsageRecords(us);
    } catch { setRecords([]); setUsageRecords([]); }
  };

  const saveEditFreq = async () => {
    if (!sel) return;
    const vals = await editForm.validateFields();
    try {
      const r = await updateAllocationBlock(sel.id, {
        uplinkStartFreq: vals.uplinkStartFreq, uplinkEndFreq: vals.uplinkEndFreq,
      });
      message.success(`频率已调整,新块代码:${r.blockCode}`);
      setSel(null); bumpDataVersion();
    } catch (e) { message.error((e as Error).message); }
  };

  /** 块代码 / ID 搜索直达 */
  const locateBlock = (q: string) => {
    const kw = q.trim();
    if (!kw) return;
    const hit = allocs.find((a) => String(a.id) === kw)
      ?? allocs.find((a) => a.blockCode.includes(kw));
    if (!hit) { message.warning('当前卫星下未找到匹配的分配块'); return; }
    if (hit.uplinkPolarization && hit.uplinkBeam) {
      setLaneFilter(`${hit.uplinkPolarization}|${hit.uplinkBeam}`);
    }
    openAllocDetail(hit);
  };

  /** 点击规划块 → 发起分配(弹出共享分配弹窗) */
  const openCreateAlloc = (p: PlanningBlock) => {
    if (p.isValid !== 1) { message.warning('该规划块已无效,不能在其上分配'); return; }
    if (p.usageType === '禁用') { message.warning('禁用类规划块不能分配'); return; }
    setPlanSel(p);
  };

  const openDelivery = async () => {
    dlvForm.setFieldsValue({ kind: 'contract', action: '占用', exclusiveType: '独占' });
    setDlvOpen(true);
    if (contracts.length === 0) {
      try { setContracts(await fetchContracts()); } catch { /* 忽略 */ }
    }
  };

  const doDelivery = async () => {
    if (!sel) return;
    const vals = await dlvForm.validateFields();
    try {
      if (vals.kind === 'contract') {
        await createDeliveryRecord({
          contractId: vals.contractId,
          blockCode: sel.blockCode,
          action: vals.action,
          exclusiveType: vals.exclusiveType,
          handler: vals.handler,
          registrar: vals.registrar,
        });
      } else {
        await createCarrierUsageRecord({
          blockCode: sel.blockCode,
          action: vals.action,
          exclusiveType: vals.exclusiveType,
          handler: vals.handler,
          registrar: vals.registrar,
        });
      }
      message.success(`已登记「${vals.action}」过程记录`);
      setDlvOpen(false);
      setSel(null);
      bumpDataVersion();
    } catch (e) { message.error((e as Error).message); }
  };

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card size="small" style={cardStyle}>
        <Space wrap>
          <Select allowClear placeholder="波束/极化车道" style={{ width: 220 }}
            value={laneFilter} onChange={setLaneFilter}
            options={lanes.map((l) => ({
              value: l.key,
              label: `${l.beamName ?? l.beam} · ${l.polarization} 极化`,
            }))} />
          <Segmented
            value={occFilter}
            onChange={(v) => setOccFilter(v as OccFilter)}
            options={[
              { value: 'all', label: '全部' },
              { value: 'contract', label: '合约占用' },
              { value: 'carrier', label: '自用占用' },
              { value: 'idle', label: '空闲' },
              { value: 'invalid', label: '无效' },
            ]}
          />
          <Input.Search allowClear placeholder="块代码 / 分配块ID 直达" style={{ width: 220 }}
            prefix={<AimOutlined style={{ color: '#4a6a8a' }} />} onSearch={locateBlock} />
          <span style={{ color: '#4a6a8a', fontSize: 12 }}>
            规划 {plans.length} · 分配 {allocs.length} · 占用中 {occupiedCount}
            {occFilter !== 'all' ? ` · 筛出 ${filteredAllocs.length}` : ''}
          </span>
        </Space>
        <LaneLegend showAllocation />
        <div style={{ color: '#7da3c8', fontSize: 11, paddingLeft: 2 }}>
          本页完成两件事 —— <b>分配</b>:点击规划块,在其范围内切分并登记频率块信息(写入通道分配状态);
          <b>登记</b>:点击分配块,登记占用/释放过程记录(合约交付 / 自用载波)并查看占用时间线。
        </div>
      </Card>

      <Spin spinning={loading}>
        <FreqLaneBoard
          lanes={visibleLanes}
          showAllocation
          onPlanningClick={openCreateAlloc}
          onAllocationClick={openAllocDetail}
          highlightPlanningId={planSel?.id}
        />
      </Spin>

      {/* ── 分配块详情:频谱上下文 + 占用时间线 ── */}
      <Drawer open={!!sel} onClose={() => setSel(null)} width={620}
        title={`分配块 #${sel?.id} · 登记信息`}
        extra={<Button type="primary" size="small" onClick={openDelivery}>登记占用/释放</Button>}>
        {sel && (
          <>
            {/* 频谱上下文图 */}
            {selPlanning ? (
              <>
                <div style={{ color: '#4a6a8a', fontSize: 11, marginBottom: 6 }}>
                  频谱上下文 — 规划块 #{selPlanning.id}
                  <Tag style={{ marginLeft: 8 }}
                    color={selPlanning.usageType ? USAGE_COLORS[selPlanning.usageType] : undefined}>
                    {selPlanning.usageType}
                  </Tag>
                  <span style={{ fontFamily: 'monospace' }}>
                    {fmtRange(selPlanning.uplinkStartFreq, selPlanning.uplinkEndFreq)}
                  </span>
                  <span style={{ marginLeft: 8 }}>内含 {selSiblings.length} 个分配块,金色为当前块</span>
                </div>
                <AllocationContextViz planning={selPlanning} siblings={selSiblings} selfId={sel.id}
                  beamNames={beamNames} preview={editPreview} />
                {planUtil && (
                  <div style={{ display: 'flex', gap: 24, margin: '10px 2px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#4a6a8a', fontSize: 11 }}>
                        规划内分配率
                        <span style={{ float: 'right', fontFamily: 'monospace' }}>
                          {planUtil.allocated.toFixed(1)} / {planUtil.planned.toFixed(1)} MHz
                        </span>
                      </div>
                      <Progress percent={Math.min(100, Math.round(planUtil.allocated / planUtil.planned * 100))}
                        size="small" strokeColor="#3b82f6" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#4a6a8a', fontSize: 11 }}>
                        规划内占用率
                        <span style={{ float: 'right', fontFamily: 'monospace' }}>
                          {planUtil.occupied.toFixed(1)} / {planUtil.planned.toFixed(1)} MHz
                        </span>
                      </div>
                      <Progress percent={Math.min(100, Math.round(planUtil.occupied / planUtil.planned * 100))}
                        size="small" strokeColor="#f59e0b" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Alert type="warning" showIcon style={{ marginBottom: 10 }}
                message="该分配块未关联任何规划块(历史数据),无法绘制频谱上下文" />
            )}

            <Descriptions size="small" column={2} bordered style={{ marginTop: 14 }}
              labelStyle={{ color: '#4a6a8a', width: 92 }}>
              <Descriptions.Item label="占用状况" span={2}>
                <Tag color={(sel.contractBalance ?? 0) > 0 ? 'orange' : (sel.carrierBalance ?? 0) > 0 ? 'cyan' : 'default'}>
                  {allocStatusText(sel)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="结构状态">
                <Tooltip title="占用/释放与有效/无效互相独立:块被拆分或冲突才置无效">
                  <Tag color={sel.isValid === 1 ? 'green' : 'red'}>
                    {sel.isValid === 1 ? '有效' : '无效(拆分/冲突)'}
                  </Tag>
                </Tooltip>
              </Descriptions.Item>
              <Descriptions.Item label="带宽">{sel.bandwidth} MHz</Descriptions.Item>
              <Descriptions.Item label="上行" span={2}>
                {beamLabel(beamNames, sel.uplinkBeam)} · {sel.uplinkPolarization} 极化 ·{' '}
                <span style={{ fontFamily: 'monospace' }}>{fmtRange(sel.uplinkStartFreq, sel.uplinkEndFreq)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="下行" span={2}>
                {beamLabel(beamNames, sel.downlinkBeam)} · {sel.downlinkPolarization} 极化 ·{' '}
                <span style={{ fontFamily: 'monospace' }}>{fmtRange(sel.downlinkStartFreq, sel.downlinkEndFreq)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="块代码" span={2}>
                <Typography.Text copyable style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {sel.blockCode}
                </Typography.Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider titlePlacement="start" style={{ fontSize: 12, color: '#4a6a8a', margin: '16px 0 10px' }}>
              状态操作
            </Divider>
            <Space wrap>
              <Button size="small" onClick={async () => {
                try {
                  await updateAllocationBlock(sel.id, { isValid: sel.isValid === 1 ? 0 : 1 });
                  message.success('结构状态已调整(与占用/释放无关)');
                  setSel(null); bumpDataVersion();
                } catch (e) { message.error((e as Error).message); }
              }}>
                {sel.isValid === 1 ? '置为无效(拆分/冲突)' : '恢复有效'}
              </Button>
              <Popconfirm title="删除该分配块?" description="已有交付/使用记录时将被拒绝"
                onConfirm={async () => {
                  try {
                    await deleteAllocationBlock(sel.id);
                    message.success('已删除');
                    setSel(null); bumpDataVersion();
                  } catch (e) { message.error((e as Error).message); }
                }}>
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </Space>

            <Divider titlePlacement="start" style={{ fontSize: 12, color: '#4a6a8a', margin: '16px 0 10px' }}>
              频率调整
            </Divider>
            {selOccupied ? (
              <Alert type="warning" showIcon
                message="该分配块正被占用,不能调整频率;请先在下方登记释放后再调整" />
            ) : (
              <>
                <Form form={editForm} layout="inline">
                  <Form.Item name="uplinkStartFreq" label="上行起始" rules={[{ required: true }]}>
                    <InputNumber style={{ width: 130 }} step={0.5} addonAfter="M"
                      min={selPlanning?.uplinkStartFreq ?? undefined}
                      max={selPlanning?.uplinkEndFreq ?? undefined} />
                  </Form.Item>
                  <Form.Item name="uplinkEndFreq" label="上行终止" rules={[{ required: true }]}>
                    <InputNumber style={{ width: 130 }} step={0.5} addonAfter="M"
                      min={selPlanning?.uplinkStartFreq ?? undefined}
                      max={selPlanning?.uplinkEndFreq ?? undefined} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" size="small" icon={<SaveOutlined />}
                      disabled={editOverlapped.length > 0} onClick={saveEditFreq}>
                      保存频率
                    </Button>
                  </Form.Item>
                </Form>
                {editPreview && (
                  <div style={{ color: '#fbbf24', fontSize: 11, marginTop: 8 }}>
                    新范围已在上方频谱图中以金色虚线预览;下行频率将按上下行成对关系自动平移。
                  </div>
                )}
                {editOverlapped.length > 0 && (
                  <Alert type="error" showIcon style={{ marginTop: 8 }}
                    message={`新范围与既有分配块重叠:${editOverlapped.map((o) => `#${o.id}`).join('、')}`} />
                )}
              </>
            )}

            <Card size="small" style={{ ...cardStyle, marginTop: 14 }}
              title={`占用时间线(合约 ${records.length} · 自用 ${usageRecords.length})`}>
              <OccupancyTimeline deliveries={records} usages={usageRecords} />
            </Card>
          </>
        )}
      </Drawer>

      {/* ── 在规划块内新建分配(共享弹窗) ── */}
      <AllocationEditorModal
        planning={planSel}
        siblings={createSiblings}
        beamNames={beamNames}
        onClose={() => setPlanSel(null)}
        onSaved={bumpDataVersion}
      />

      {/* ── 登记交付(占用/释放) ── */}
      <Modal
        open={dlvOpen}
        title={`登记占用/释放 — 分配块 #${sel?.id}`}
        onCancel={() => setDlvOpen(false)}
        onOk={doDelivery}
        okText="登记"
        width={620}
      >
        <Alert type="warning" showIcon style={{ marginBottom: 14 }}
          message="过程记录将引用该分配块的频率块代码;释放不会使分配块失效(占用/释放与有效/无效是两个独立概念)" />
        <Form form={dlvForm} layout="vertical">
          <Form.Item name="kind" label="记录类型" rules={[{ required: true }]}>
            <Radio.Group options={[
              { value: 'contract', label: '合约交付(出租/合作)' },
              { value: 'carrier', label: '自有载波使用(自用)' },
            ]} />
          </Form.Item>
          {dlvKind === 'contract' && (
            <Form.Item name="contractId" label="关联合约" rules={[{ required: true, message: '请选择合约' }]}>
              <Select
                showSearch optionFilterProp="label" placeholder="搜索客户/商品"
                options={contracts.map((c) => ({
                  value: c.id,
                  label: `#${c.id} ${c.customerName} · ${c.productName} · ${c.bandwidthMHz}MHz`,
                }))}
              />
            </Form.Item>
          )}
          <Space size="middle" wrap>
            <Form.Item name="action" label="动作" rules={[{ required: true }]}>
              <Radio.Group options={[{ value: '占用', label: '占用' }, { value: '释放', label: '释放' }]} />
            </Form.Item>
            <Form.Item name="exclusiveType" label="独占/共享">
              <Select style={{ width: 100 }} options={[
                { value: '独占', label: '独占' }, { value: '共享', label: '共享' },
              ]} />
            </Form.Item>
            <Form.Item name="handler" label="受理人员"><Input style={{ width: 110 }} /></Form.Item>
            <Form.Item name="registrar" label="登记人员"><Input style={{ width: 110 }} /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
