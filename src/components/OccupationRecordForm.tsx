import { useEffect, useState, useRef } from 'react';
import {
  Modal, Form, Select, InputNumber,
  Alert, Tag, Badge, Space, Divider, Input,
} from 'antd';
import { useStore } from '@/store/useStore';
import {
  createOccupationRecord, updateOccupationRecord,
  fetchOccupationRecordsForConflict,
} from '@/api';
import { hasConflict, fmtChannelLabel } from '@/utils/freqCalc';
import SpectrumChart from './SpectrumChart';
import type { Transponder, FrequencyBlock, OccupationRecord } from '@/types';

interface OccupationRecordFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord: OccupationRecord | null;
  transponders: Transponder[];
  /** P 状态的规划块列表（由父组件传入，可限定范围） */
  planningBlocks: FrequencyBlock[];
  /** 预选规划块（从 Drawer 打开时传入） */
  initPlanningBlock?: FrequencyBlock | null;
}

const DARK = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  muted: '#64748b',
};

const BLOCK_VALID_OPTIONS = [
  { value: 1, label: '有效' },
  { value: 0, label: '无效' },
];

const USAGE_COLOR: Record<string, string> = {
  出租: '#1677ff', 合作: '#52c41a', 自用: '#8b5cf6', 禁用: '#ff4d4f',
};

export default function OccupationRecordForm({
  open, onClose, onSuccess, editRecord, transponders, planningBlocks, initPlanningBlock,
}: OccupationRecordFormProps) {
  const { bumpDataVersion } = useStore();

  const [form] = Form.useForm<{
    planningBlockId: number;
    rxActualStart: number;
    rxActualEnd: number;
    txActualStart: number;
    txActualEnd: number;
    blockValid: number;
    usageType: string | null;
    remarkFulfillment: string | null;
    remarkUser: string | null;
    remarkSales: string | null;
  }>();

  const updatingRef = useRef(false);
  const isEdit = editRecord !== null;

  const [selectedPlan, setSelectedPlan]   = useState<FrequencyBlock | null>(null);
  const [existingOccs, setExistingOccs]   = useState<Pick<OccupationRecord, 'id' | 'frequencyOffset' | 'occupiedBandwidth'>[]>([]);
  const [allOccsInBlock, setAllOccsInBlock] = useState<OccupationRecord[]>([]);
  const [conflictMsg, setConflictMsg]     = useState<string | null>(null);
  const [previewOffset, setPreviewOffset] = useState<number | null>(null);
  const [previewBw, setPreviewBw]         = useState<number | null>(null);

  // 从规划块找到对应转发器
  const activeTransponder: Transponder | null =
    selectedPlan ? (transponders.find((t) => t.switchId === selectedPlan.switchId) ?? null) : null;

  // 初始化
  useEffect(() => {
    if (!open) return;
    setConflictMsg(null);
    setPreviewOffset(null);
    setPreviewBw(null);
    setAllOccsInBlock([]);

    if (isEdit) {
      const rec = editRecord!;
      const plan = planningBlocks.find((b) => b.id === rec.planningBlockId) ?? null;
      setSelectedPlan(plan);
      form.setFieldsValue({
        planningBlockId:   rec.planningBlockId ?? undefined,
        rxActualStart:     rec.uplinkStartFreq   ?? undefined,
        rxActualEnd:       rec.uplinkEndFreq     ?? undefined,
        txActualStart:     rec.downlinkStartFreq ?? undefined,
        txActualEnd:       rec.downlinkEndFreq   ?? undefined,
        blockValid:        rec.blockValid ?? 1,
        usageType:         rec.usageType ?? null,
        remarkFulfillment: rec.remarkFulfillment ?? null,
        remarkUser:        rec.remarkUser ?? null,
        remarkSales:       rec.remarkSales ?? null,
      });
      if (rec.uplinkStartFreq != null && rec.uplinkEndFreq != null) {
        const tp = transponders.find((t) => t.switchId === rec.switchId);
        if (tp?.rxStartFreq != null) {
          setPreviewOffset(rec.frequencyOffset);
          setPreviewBw(rec.occupiedBandwidth);
        }
      }
    } else {
      form.resetFields();
      const init = initPlanningBlock ?? null;
      setSelectedPlan(init);
      if (init) {
        form.setFieldValue('planningBlockId', init.id);
        form.setFieldValue('usageType', init.usageType ?? null);
        form.setFieldValue('blockValid', 1);
        // 默认填入规划块的完整频率范围
        if (init.uplinkStartFreq != null) {
          form.setFieldsValue({
            rxActualStart: init.uplinkStartFreq,
            rxActualEnd:   init.uplinkEndFreq ?? undefined,
            txActualStart: init.downlinkStartFreq ?? undefined,
            txActualEnd:   init.downlinkEndFreq ?? undefined,
          });
          const tp = transponders.find((t) => t.switchId === init.switchId);
          if (tp?.rxStartFreq != null && init.uplinkStartFreq != null && init.uplinkEndFreq != null) {
            setPreviewOffset(init.frequencyOffset);
            setPreviewBw(init.occupiedBandwidth);
          }
        }
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // 加载规划块内的现有占用记录（冲突检测 + 频谱显示）
  useEffect(() => {
    if (!selectedPlan) { setExistingOccs([]); setAllOccsInBlock([]); return; }
    fetchOccupationRecordsForConflict(selectedPlan.id, isEdit ? editRecord!.id : undefined)
      .then(setExistingOccs)
      .catch(console.error);
    // 也加载完整记录，用于频谱图显示
    import('@/api').then(({ fetchOccupationRecordsByPlanningBlock }) => {
      fetchOccupationRecordsByPlanningBlock(selectedPlan.id)
        .then((all) => setAllOccsInBlock(
          isEdit ? all.filter((r) => r.id !== editRecord!.id) : all,
        ))
        .catch(console.error);
    });
  }, [selectedPlan?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePlanBlockChange(planId: number) {
    const plan = planningBlocks.find((b) => b.id === planId) ?? null;
    setSelectedPlan(plan);
    setConflictMsg(null);
    setPreviewOffset(null);
    setPreviewBw(null);
    if (plan) {
      form.setFieldsValue({
        usageType:  plan.usageType ?? null,
        blockValid: 1,
        rxActualStart: plan.uplinkStartFreq   ?? undefined,
        rxActualEnd:   plan.uplinkEndFreq     ?? undefined,
        txActualStart: plan.downlinkStartFreq ?? undefined,
        txActualEnd:   plan.downlinkEndFreq   ?? undefined,
      });
      const tp = transponders.find((t) => t.switchId === plan.switchId);
      if (tp?.rxStartFreq != null && plan.uplinkStartFreq != null && plan.uplinkEndFreq != null) {
        setPreviewOffset(plan.frequencyOffset);
        setPreviewBw(plan.occupiedBandwidth);
      }
    } else {
      form.setFieldsValue({
        rxActualStart: undefined, rxActualEnd: undefined,
        txActualStart: undefined, txActualEnd: undefined,
      });
    }
  }

  function handleValuesChange(changed: Record<string, unknown>) {
    if (updatingRef.current) return;
    if (conflictMsg) setConflictMsg(null);

    // 同步上/下行
    if (activeTransponder?.txStartFreq != null && activeTransponder?.rxStartFreq != null) {
      const shift = activeTransponder.txStartFreq - activeTransponder.rxStartFreq;
      const rxChanged = 'rxActualStart' in changed || 'rxActualEnd' in changed;
      const txChanged = 'txActualStart' in changed || 'txActualEnd' in changed;
      updatingRef.current = true;
      if (rxChanged) {
        const rxS = form.getFieldValue('rxActualStart') as number | undefined;
        const rxE = form.getFieldValue('rxActualEnd')   as number | undefined;
        if (rxS != null) form.setFieldValue('txActualStart', parseFloat((rxS + shift).toFixed(3)));
        if (rxE != null) form.setFieldValue('txActualEnd',   parseFloat((rxE + shift).toFixed(3)));
      } else if (txChanged) {
        const txS = form.getFieldValue('txActualStart') as number | undefined;
        const txE = form.getFieldValue('txActualEnd')   as number | undefined;
        if (txS != null) form.setFieldValue('rxActualStart', parseFloat((txS - shift).toFixed(3)));
        if (txE != null) form.setFieldValue('rxActualEnd',   parseFloat((txE - shift).toFixed(3)));
      }
      updatingRef.current = false;
    }

    // 更新预览偏移（相对于规划块）
    const rxS = form.getFieldValue('rxActualStart') as number | undefined;
    const rxE = form.getFieldValue('rxActualEnd')   as number | undefined;
    if (rxS != null && rxE != null && activeTransponder?.rxStartFreq != null) {
      setPreviewOffset(rxS - activeTransponder.rxStartFreq);
      setPreviewBw(rxE - rxS);
    } else {
      setPreviewOffset(null);
      setPreviewBw(null);
    }
  }

  async function handleOk() {
    let vals: Awaited<ReturnType<typeof form.validateFields>>;
    try {
      vals = await form.validateFields();
    } catch {
      return;
    }

    if (!selectedPlan) {
      setConflictMsg('请先选择规划块');
      return;
    }

    const tp = transponders.find((t) => t.switchId === selectedPlan.switchId);
    if (!tp?.rxStartFreq) {
      setConflictMsg('该规划块所在通道暂无频率数据');
      return;
    }

    const frequencyOffset   = vals.rxActualStart - tp.rxStartFreq;
    const occupiedBandwidth = vals.rxActualEnd - vals.rxActualStart;

    if (occupiedBandwidth <= 0) {
      setConflictMsg('终止频率必须大于起始频率');
      return;
    }

    // 边界：必须在规划块内
    const planRxStart = selectedPlan.uplinkStartFreq ?? (tp.rxStartFreq + selectedPlan.frequencyOffset);
    const planRxEnd   = selectedPlan.uplinkEndFreq   ?? (planRxStart + selectedPlan.occupiedBandwidth);
    if (vals.rxActualStart < planRxStart - 0.001) {
      setConflictMsg(`起始频率不能低于规划块下限 ${planRxStart.toFixed(3)} MHz`);
      return;
    }
    if (vals.rxActualEnd > planRxEnd + 0.001) {
      setConflictMsg(`终止频率不能超出规划块上限 ${planRxEnd.toFixed(3)} MHz`);
      return;
    }

    // 规划块内冲突检测
    if (hasConflict(frequencyOffset, occupiedBandwidth, existingOccs)) {
      setConflictMsg('频率段与同一规划块内的现有占用记录冲突，请调整起止频率');
      return;
    }

    const payload: Partial<OccupationRecord> = {
      planningBlockId:   selectedPlan.id,
      planningBlockCode: selectedPlan.frequencyBlockCode2 ?? null,
      switchId:          tp.switchId,
      switchCode:        tp.switchCode,
      frequencyOffset,
      occupiedBandwidth,
      blockValid:        vals.blockValid ?? 1,
      usageType:         vals.usageType ?? null,
      uplinkStartFreq:   vals.rxActualStart,
      uplinkEndFreq:     vals.rxActualEnd,
      downlinkStartFreq: vals.txActualStart,
      downlinkEndFreq:   vals.txActualEnd,
      remarkFulfillment: vals.remarkFulfillment ?? null,
      remarkUser:        vals.remarkUser ?? null,
      remarkSales:       vals.remarkSales ?? null,
    };

    if (isEdit) {
      await updateOccupationRecord(editRecord!.id, payload);
    } else {
      await createOccupationRecord(payload);
    }

    bumpDataVersion();
    onSuccess();
    onClose();
  }

  // 频谱图：以规划块为坐标系，相对偏移
  const planRxStart = selectedPlan?.uplinkStartFreq ?? null;
  const planRxEnd   = selectedPlan?.uplinkEndFreq   ?? null;
  const planTxStart = selectedPlan?.downlinkStartFreq ?? null;
  const planTxEnd   = selectedPlan?.downlinkEndFreq   ?? null;
  const planBw      = selectedPlan?.occupiedBandwidth ?? null;
  const planOffset  = selectedPlan?.frequencyOffset   ?? 0;

  const occsRelative = allOccsInBlock.map((occ) => ({
    frequencyOffset:   occ.frequencyOffset - planOffset,
    occupiedBandwidth: occ.occupiedBandwidth,
    partitionStatus:   (occ.blockValid === 0 ? 'R' : 'P') as 'P' | 'R',
    usageType:         occ.usageType,
  }));

  const previewOcc =
    previewOffset != null && previewBw != null && previewBw > 0
      ? { frequencyOffset: previewOffset - planOffset, occupiedBandwidth: previewBw }
      : null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      title={
        <span style={{ color: DARK.text }}>
          {isEdit ? '编辑占用记录' : '新建占用记录'}
        </span>
      }
      width={700}
      okText={isEdit ? '保存' : '新建'}
      cancelText="取消"
      destroyOnHidden
      styles={{
        body:   { background: DARK.card },
        header: { background: DARK.card, borderBottom: `1px solid ${DARK.border}` },
        footer: { background: DARK.card, borderTop:    `1px solid ${DARK.border}` },
        mask:   { backdropFilter: 'blur(2px)' },
      }}
    >
      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>

        {/* ─ 规划块选择（主对象） ─ */}
        <Form.Item
          name="planningBlockId"
          label={<span style={{ color: DARK.text, fontWeight: 600 }}>目标规划块</span>}
          rules={[{ required: true, message: '请选择要分配占用的规划块' }]}
          style={{ marginBottom: 8 }}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={planningBlocks.length === 0 ? '该通道暂无可用规划块' : '选择规划块'}
            disabled={isEdit}
            onChange={handlePlanBlockChange}
            options={planningBlocks.map((b) => {
              const tp = transponders.find((t) => t.switchId === b.switchId);
              const chLabel = tp ? fmtChannelLabel(tp) : `Switch ${b.switchId}`;
              const freqLabel = b.uplinkStartFreq != null
                ? `${b.uplinkStartFreq.toFixed(1)}~${b.uplinkEndFreq?.toFixed(1)} MHz`
                : `OFF${b.frequencyOffset} BW${b.occupiedBandwidth}`;
              return {
                value: b.id,
                label: `${chLabel}  |  ${freqLabel}  |  ${b.usageType ?? '—'}  |  ${b.occupiedBandwidth} MHz`,
              };
            })}
          />
        </Form.Item>

        {/* ─ 规划块信息卡 ─ */}
        {selectedPlan && (
          <div style={{
            background: '#0c1a2e',
            border: '1px solid #1e3a5f',
            borderRadius: 6,
            padding: '8px 14px',
            marginBottom: 16,
            fontSize: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              {activeTransponder && (
                <b style={{ color: DARK.text, fontFamily: 'monospace' }}>
                  {fmtChannelLabel(activeTransponder)}
                </b>
              )}
              {selectedPlan.usageType && (
                <span style={{
                  fontSize: 11, padding: '1px 6px', borderRadius: 3,
                  background: (USAGE_COLOR[selectedPlan.usageType] ?? '#475569') + '33',
                  color: USAGE_COLOR[selectedPlan.usageType] ?? '#94a3b8',
                  fontWeight: 600,
                }}>
                  {selectedPlan.usageType}
                </span>
              )}
              {activeTransponder && (
                <Badge
                  status={activeTransponder.switchStatus === 1 ? 'success' : 'error'}
                  text={activeTransponder.switchStatus === 1 ? '开关：开' : '开关：关'}
                />
              )}
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ color: '#38bdf8' }}>
                规划上行：{planRxStart?.toFixed(3) ?? '—'} ~ {planRxEnd?.toFixed(3) ?? '—'} MHz
              </span>
              <span style={{ color: '#34d399' }}>
                规划下行：{planTxStart?.toFixed(3) ?? '—'} ~ {planTxEnd?.toFixed(3) ?? '—'} MHz
              </span>
              <span style={{ color: DARK.muted }}>规划带宽：{selectedPlan.occupiedBandwidth} MHz</span>
            </div>
          </div>
        )}

        {/* ─ 占用频率输入（受规划块约束） ─ */}
        <div style={{ color: '#38bdf8', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>
          占用上行频率（MHz）
          {planRxStart != null && (
            <span style={{ color: DARK.muted, fontWeight: 400, marginLeft: 8 }}>
              可用范围：{planRxStart.toFixed(3)} ~ {planRxEnd?.toFixed(3)} MHz
            </span>
          )}
        </div>
        <Space style={{ width: '100%', marginBottom: 4 }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="rxActualStart"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>起始</span>}
            rules={[{ required: true, message: '请输入上行起始频率' }]}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <InputNumber style={{ width: '100%' }} step={0.5} precision={3}
              placeholder={planRxStart != null ? `≥ ${planRxStart.toFixed(3)}` : '上行起始频率 MHz'}
              addonAfter="MHz" disabled={!selectedPlan}
            />
          </Form.Item>
          <Form.Item name="rxActualEnd"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>终止</span>}
            rules={[{ required: true, message: '请输入上行终止频率' }]}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <InputNumber style={{ width: '100%' }} step={0.5} precision={3}
              placeholder={planRxEnd != null ? `≤ ${planRxEnd.toFixed(3)}` : '上行终止频率 MHz'}
              addonAfter="MHz" disabled={!selectedPlan}
            />
          </Form.Item>
        </Space>

        <div style={{ color: '#34d399', fontSize: 12, marginBottom: 6, marginTop: 4, fontWeight: 500 }}>
          占用下行频率（MHz）
        </div>
        <Space style={{ width: '100%', marginBottom: 4 }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="txActualStart"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>起始</span>}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <InputNumber style={{ width: '100%' }} step={0.5} precision={3}
              placeholder="下行起始频率 MHz" addonAfter="MHz" disabled={!selectedPlan}
            />
          </Form.Item>
          <Form.Item name="txActualEnd"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>终止</span>}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <InputNumber style={{ width: '100%' }} step={0.5} precision={3}
              placeholder="下行终止频率 MHz" addonAfter="MHz" disabled={!selectedPlan}
            />
          </Form.Item>
        </Space>

        {/* ─ 带宽预览 ─ */}
        {previewBw != null && previewBw > 0 && (
          <div style={{
            background: DARK.bg, border: `1px solid ${DARK.border}`, borderRadius: 6,
            padding: '5px 12px', marginBottom: 12, fontSize: 12, display: 'flex', gap: 20, flexWrap: 'wrap',
          }}>
            <span style={{ color: DARK.muted }}>
              占用带宽：<b style={{ color: DARK.text }}>{previewBw.toFixed(3)} MHz</b>
            </span>
            {planBw != null && (
              <span style={{ color: DARK.muted }}>
                规划块利用率：<b style={{ color: previewBw / planBw > 0.9 ? '#f97316' : DARK.text }}>
                  {((previewBw / planBw) * 100).toFixed(1)}%
                </b>
              </span>
            )}
          </div>
        )}

        {/* ─ 分配块有效性 + 用途 ─ */}
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="blockValid"
            label={<span style={{ color: DARK.muted }}>分配块状态</span>}
            rules={[{ required: true, message: '请选择状态' }]}
            style={{ flex: 1 }}
          >
            <Select options={BLOCK_VALID_OPTIONS} placeholder="有效 / 无效" />
          </Form.Item>
          <Form.Item name="usageType"
            label={<span style={{ color: DARK.muted }}>用途（继承自规划块）</span>}
            style={{ flex: 1 }}
          >
            <Select
              options={[
                { value: '出租', label: '出租' },
                { value: '合作', label: '合作' },
                { value: '自用', label: '自用' },
                { value: '禁用', label: '禁用' },
              ]}
              placeholder="出租 / 合作 / 自用 / 禁用"
              allowClear
            />
          </Form.Item>
        </Space>

        <Divider style={{ borderColor: DARK.border, margin: '4px 0 12px' }} />
        <div style={{ color: DARK.muted, fontSize: 12, marginBottom: 8 }}>维护备注（选填）</div>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="remarkFulfillment"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>履约状态</span>}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <Input placeholder="合同履约状态说明" />
          </Form.Item>
          <Form.Item name="remarkUser"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>用户</span>}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <Input placeholder="用户名称" />
          </Form.Item>
          <Form.Item name="remarkSales"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>销售</span>}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <Input placeholder="销售人员" />
          </Form.Item>
        </Space>

        {conflictMsg && (
          <Alert type="error" message={conflictMsg} showIcon style={{ marginBottom: 8 }} />
        )}
      </Form>

      {/* ─ 频谱预览（以规划块为坐标系） ─ */}
      {selectedPlan && planBw != null && (
        <>
          <Divider style={{ borderColor: DARK.border, margin: '4px 0 10px' }} />
          <div style={{ color: DARK.muted, fontSize: 12, marginBottom: 6 }}>
            规划块内频谱预览
            {allOccsInBlock.length > 0 && (
              <Tag style={{ marginLeft: 8, fontSize: 10 }} color="blue">
                已有 {allOccsInBlock.length} 条占用
              </Tag>
            )}
          </div>
          <SpectrumChart
            rxStartFreq={planRxStart}
            rxEndFreq={planRxEnd}
            txStartFreq={planTxStart}
            txEndFreq={planTxEnd}
            channelBw={planBw}
            occupations={occsRelative}
            transponderName={selectedPlan.frequencyBlockCode2 ?? '规划块'}
            previewOcc={previewOcc}
            switchOff={activeTransponder?.switchStatus !== 1}
          />
        </>
      )}
    </Modal>
  );
}
