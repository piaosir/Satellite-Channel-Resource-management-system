import { useEffect, useState, useRef } from 'react';
import {
  Modal, Form, Select, InputNumber,
  Alert, Tag, Badge, Space, Divider,
} from 'antd';
import { useStore } from '@/store/useStore';
import {
  createFrequencyBlock, updateFrequencyBlock, fetchFrequencyBlocks,
} from '@/api';
import { hasConflict, fmtChannelLabel } from '@/utils/freqCalc';
import SpectrumChart from './SpectrumChart';
import type { Transponder, FrequencyBlock } from '@/types';

interface OccupationFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** null = 新建模式，non-null = 编辑模式 */
  editRecord: FrequencyBlock | null;
  /** 当前卫星下的所有转发器列表（新建时用于选择） */
  transponders: Transponder[];
  /** 新建时预选的转发器 */
  initTransponder?: Transponder | null;
}

/** 划分状态选项 */
const PARTITION_OPTIONS = [
  { value: 'P', label: 'P — 划分（在用）' },
  { value: 'R', label: 'R — 回收（空闲）' },
];
/** 用途分类选项 */
const USAGE_TYPE_OPTIONS = [
  { value: '出租', label: '出租' },
  { value: '合作', label: '合作' },
  { value: '自用', label: '自用' },
  { value: '禁用', label: '禁用' },
];

const DARK = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  muted: '#64748b',
};

/** 从起止频率推算偏移量和带宽（上行侧） */
function toOffsetBw(rxActualStart: number, rxActualEnd: number, rxChannelStart: number) {
  return {
    frequencyOffset:   rxActualStart - rxChannelStart,
    occupiedBandwidth: rxActualEnd - rxActualStart,
  };
}

export default function OccupationForm({
  open, onClose, onSuccess, editRecord, transponders, initTransponder,
}: OccupationFormProps) {
  const { role, bumpDataVersion } = useStore();

  // 表单字段：以起止频率为主，内部换算为 offset+bw 再存库
  const [form] = Form.useForm<{
    switchId: number;
    rxActualStart: number;
    rxActualEnd: number;
    txActualStart: number;
    txActualEnd: number;
    partitionStatus: 'P' | 'R';
    usageType: string | null;
  }>();

  // 防止 onValuesChange 在程序化 setFieldValue 时循环触发
  const updatingRef = useRef(false);

  const isEdit = editRecord !== null;

  const [activeSwitchId, setActiveSwitchId] = useState<number | null>(null);
  const [existingOccs, setExistingOccs]     = useState<FrequencyBlock[]>([]);
  const [conflictMsg, setConflictMsg]       = useState<string | null>(null);

  // 实时预览用的 offset + bw（随表单值联动）
  const [previewOffset, setPreviewOffset] = useState<number | null>(null);
  const [previewBw, setPreviewBw]         = useState<number | null>(null);

  const activeTransponder: Transponder | null =
    transponders.find((t) => t.switchId === activeSwitchId) ?? null;
  const hasFreqData = activeTransponder?.rxStartFreq != null;

  // ── Modal 打开时初始化 ───────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setConflictMsg(null);

    if (isEdit) {
      const rec = editRecord!;
      setActiveSwitchId(rec.switchId);
      const tp = transponders.find((t) => t.switchId === rec.switchId);
      const rx0 = tp?.rxStartFreq ?? 0;
      const tx0 = tp?.txStartFreq ?? 0;
      const rxStart = rx0 + rec.frequencyOffset;
      const rxEnd   = rxStart + rec.occupiedBandwidth;
      const txStart = tx0 + rec.frequencyOffset;
      const txEnd   = txStart + rec.occupiedBandwidth;
      form.setFieldsValue({
        switchId:        rec.switchId,
        rxActualStart:   rxStart,
        rxActualEnd:     rxEnd,
        txActualStart:   txStart,
        txActualEnd:     txEnd,
        partitionStatus: rec.partitionStatus ?? 'P',
        usageType:       rec.usageType ?? null,
      });
      setPreviewOffset(rec.frequencyOffset);
      setPreviewBw(rec.occupiedBandwidth);
    } else {
      form.resetFields();
      const initId = initTransponder?.switchId ?? null;
      setActiveSwitchId(initId);
      if (initId != null) form.setFieldValue('switchId', initId);
      setPreviewOffset(null);
      setPreviewBw(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 选中转发器变化时加载占用列表 ────────────────────────────
  useEffect(() => {
    if (activeSwitchId == null) { setExistingOccs([]); return; }
    fetchFrequencyBlocks(activeSwitchId)
      .then((list) => setExistingOccs(isEdit ? list.filter((o) => o.id !== editRecord!.id) : list))
      .catch(console.error);
  }, [activeSwitchId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 表单值变化时同步另一侧频率并更新预览 ─────────────────────
  function handleValuesChange(changed: Record<string, unknown>) {
    if (updatingRef.current) return;
    if (conflictMsg) setConflictMsg(null);

    const shift =
      activeTransponder?.txStartFreq != null && activeTransponder?.rxStartFreq != null
        ? activeTransponder.txStartFreq - activeTransponder.rxStartFreq
        : null;

    if (shift != null) {
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

    // 更新频谱预览
    const rxS = form.getFieldValue('rxActualStart') as number | undefined;
    const rxE = form.getFieldValue('rxActualEnd')   as number | undefined;
    if (rxS != null && rxE != null && activeTransponder?.rxStartFreq != null) {
      const { frequencyOffset, occupiedBandwidth } = toOffsetBw(rxS, rxE, activeTransponder.rxStartFreq);
      setPreviewOffset(frequencyOffset);
      setPreviewBw(occupiedBandwidth);
    } else {
      setPreviewOffset(null);
      setPreviewBw(null);
    }
  }

  function handleSwitchChange(id: number) {
    setActiveSwitchId(id);
    setPreviewOffset(null);
    setPreviewBw(null);
    setConflictMsg(null);
    // 清空频率输入，因为通道基准变了
    form.setFieldsValue({ rxActualStart: undefined, rxActualEnd: undefined, txActualStart: undefined, txActualEnd: undefined });
  }

  // ── 提交 ─────────────────────────────────────────────────────
  async function handleOk() {

    let vals: Awaited<ReturnType<typeof form.validateFields>>;
    try {
      vals = await form.validateFields();
    } catch {
      return;
    }

    const targetSwitchId = isEdit ? editRecord!.switchId : vals.switchId;
    const tp = transponders.find((t) => t.switchId === targetSwitchId);

    if (!tp?.rxStartFreq) {
      setConflictMsg('该通道暂无频率数据，无法确定偏移量');
      return;
    }

    const { frequencyOffset, occupiedBandwidth } = toOffsetBw(
      vals.rxActualStart, vals.rxActualEnd, tp.rxStartFreq,
    );

    // 范围校验
    if (frequencyOffset < 0) {
      setConflictMsg(`起始频率不能低于通道起始频率 ${tp.rxStartFreq} MHz`);
      return;
    }
    if (tp.channelBw != null && frequencyOffset + occupiedBandwidth > tp.channelBw) {
      setConflictMsg(`终止频率超出通道范围（上限 ${(tp.rxStartFreq + tp.channelBw).toFixed(3)} MHz）`);
      return;
    }
    if (occupiedBandwidth <= 0) {
      setConflictMsg('终止频率必须大于起始频率');
      return;
    }

    // 冲突检测
    if (hasConflict(frequencyOffset, occupiedBandwidth, existingOccs)) {
      setConflictMsg('频率段与现有占用冲突，请调整起止频率');
      return;
    }

    if (isEdit) {
      await updateFrequencyBlock(editRecord!.id, {
        frequencyOffset,
        occupiedBandwidth,
        partitionStatus:  vals.partitionStatus,
        usageType:        vals.usageType ?? null,
        uplinkStartFreq:   vals.rxActualStart,
        uplinkEndFreq:     vals.rxActualEnd,
        downlinkStartFreq: vals.txActualStart,
        downlinkEndFreq:   vals.txActualEnd,
      });
    } else {
      await createFrequencyBlock({
        switchId:        targetSwitchId,
        switchCode:      tp.switchCode,
        frequencyOffset,
        occupiedBandwidth,
        partitionStatus:  vals.partitionStatus,
        usageType:        vals.usageType ?? null,
        uplinkStartFreq:   vals.rxActualStart,
        uplinkEndFreq:     vals.rxActualEnd,
        downlinkStartFreq: vals.txActualStart,
        downlinkEndFreq:   vals.txActualEnd,
      });
    }

    bumpDataVersion();
    onSuccess();
    onClose();
  }

  // ── 衍生展示值 ───────────────────────────────────────────────

  const previewOcc =
    previewOffset != null && previewBw != null
      ? { frequencyOffset: previewOffset, occupiedBandwidth: previewBw }
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
      width={660}
      okText={isEdit ? '保存' : '新建'}
      cancelText="取消"
      destroyOnClose
      styles={{
        body:   { background: DARK.card },
        header: { background: DARK.card, borderBottom: `1px solid ${DARK.border}` },
        footer: { background: DARK.card, borderTop:    `1px solid ${DARK.border}` },
        mask:   { backdropFilter: 'blur(2px)' },
      }}
    >
      {/* ── 通道信息卡 ── */}
      {activeTransponder && (
        <div style={{
          background: DARK.bg,
          border: `1px solid ${DARK.border}`,
          borderRadius: 6,
          padding: '8px 14px',
          marginBottom: 16,
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <b style={{ color: DARK.text, fontFamily: 'monospace' }}>{fmtChannelLabel(activeTransponder)}</b>
            <Tag color={activeTransponder.band === 'Ku' ? 'blue' : activeTransponder.band === 'EKu' ? 'purple' : 'green'} style={{ margin: 0 }}>
              {activeTransponder.band}
            </Tag>
            {activeTransponder.polarization && (
              <Tag style={{ margin: 0 }}>{activeTransponder.polarization}</Tag>
            )}
            <Badge
              status={activeTransponder.switchStatus === 1 ? 'success' : 'error'}
              text={activeTransponder.switchStatus === 1 ? '开关：开' : '开关：关'}
            />
          </div>
          {hasFreqData ? (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span style={{ color: '#38bdf8' }}>
                上行通道：{activeTransponder.rxStartFreq} ~ {activeTransponder.rxEndFreq} MHz
              </span>
              <span style={{ color: '#34d399' }}>
                下行通道：{activeTransponder.txStartFreq} ~ {activeTransponder.txEndFreq} MHz
              </span>
              <span style={{ color: DARK.muted }}>
                带宽：{activeTransponder.channelBw} MHz
              </span>
            </div>
          ) : (
            <span style={{ color: '#f59e0b' }}>⚠ 该通道暂无频率数据</span>
          )}
        </div>
      )}

      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>

        {/* 新建时选择通道 */}
        {!isEdit && (
          <Form.Item
            name="switchId"
            label={<span style={{ color: DARK.muted }}>通道</span>}
            rules={[{ required: true, message: '请选择通道' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择通道"
              onChange={handleSwitchChange}
              options={transponders.map((t) => ({
                value: t.switchId,
                label: fmtChannelLabel(t),
              }))}
            />
          </Form.Item>
        )}

        {/* ── 上行起止频率 ── */}
        <div style={{ color: '#38bdf8', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>上行频率（MHz）</div>
        <Space style={{ width: '100%', marginBottom: 4 }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            name="rxActualStart"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>起始</span>}
            rules={[{ required: true, message: '请输入上行起始频率' }]}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              step={0.5}
              precision={3}
              placeholder={activeTransponder?.rxStartFreq != null
                ? `≥ ${activeTransponder.rxStartFreq}`
                : '上行起始频率 MHz'}
              min={activeTransponder?.rxStartFreq ?? undefined}
              max={activeTransponder?.rxEndFreq   ?? undefined}
              addonAfter="MHz"
              disabled={!hasFreqData && !!activeSwitchId}
            />
          </Form.Item>
          <Form.Item
            name="rxActualEnd"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>终止</span>}
            rules={[{ required: true, message: '请输入上行终止频率' }]}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              step={0.5}
              precision={3}
              placeholder={activeTransponder?.rxEndFreq != null
                ? `≤ ${activeTransponder.rxEndFreq}`
                : '上行终止频率 MHz'}
              min={activeTransponder?.rxStartFreq ?? undefined}
              max={activeTransponder?.rxEndFreq   ?? undefined}
              addonAfter="MHz"
              disabled={!hasFreqData && !!activeSwitchId}
            />
          </Form.Item>
        </Space>

        {/* ── 下行起止频率 ── */}
        <div style={{ color: '#34d399', fontSize: 12, marginBottom: 6, marginTop: 4, fontWeight: 500 }}>下行频率（MHz）</div>
        <Space style={{ width: '100%', marginBottom: 4 }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            name="txActualStart"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>起始</span>}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              step={0.5}
              precision={3}
              placeholder={activeTransponder?.txStartFreq != null
                ? `≥ ${activeTransponder.txStartFreq}`
                : '下行起始频率 MHz'}
              min={activeTransponder?.txStartFreq ?? undefined}
              max={activeTransponder?.txEndFreq   ?? undefined}
              addonAfter="MHz"
              disabled={!hasFreqData && !!activeSwitchId}
            />
          </Form.Item>
          <Form.Item
            name="txActualEnd"
            label={<span style={{ color: DARK.muted, fontSize: 12 }}>终止</span>}
            style={{ flex: 1, marginBottom: 8 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              step={0.5}
              precision={3}
              placeholder={activeTransponder?.txEndFreq != null
                ? `≤ ${activeTransponder.txEndFreq}`
                : '下行终止频率 MHz'}
              min={activeTransponder?.txStartFreq ?? undefined}
              max={activeTransponder?.txEndFreq   ?? undefined}
              addonAfter="MHz"
              disabled={!hasFreqData && !!activeSwitchId}
            />
          </Form.Item>
        </Space>

        {/* ── 弦生：带宽 + 偏移量 ── */}
        {(previewBw != null || previewOffset != null) && (
          <div style={{
            background: DARK.bg,
            border: `1px solid ${DARK.border}`,
            borderRadius: 6,
            padding: '5px 12px',
            marginBottom: 12,
            fontSize: 12,
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
          }}>
            {previewBw != null && (
              <span style={{ color: DARK.muted }}>
                占用带宽：<b style={{ color: DARK.text }}>{previewBw.toFixed(3)} MHz</b>
              </span>
            )}
            {previewOffset != null && (
              <span style={{ color: DARK.muted }}>
                偏移量：<b style={{ color: DARK.text }}>{previewOffset.toFixed(3)} MHz</b>
              </span>
            )}
          </div>
        )}

        {/* ── 划分状态 + 用途 ── */}
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            name="partitionStatus"
            label={<span style={{ color: DARK.muted }}>划分状态</span>}
            rules={[{ required: true, message: '请选择划分状态' }]}
            style={{ flex: 1 }}
          >
            <Select options={PARTITION_OPTIONS} placeholder="划分状态" />
          </Form.Item>
          <Form.Item
            name="usageType"
            label={<span style={{ color: DARK.muted }}>用途分类（可选）</span>}
            style={{ flex: 1 }}
          >
            <Select
              options={USAGE_TYPE_OPTIONS}
              placeholder="出租 / 合作 / 自用 / 禁用"
              allowClear
            />
          </Form.Item>
        </Space>

        {/* ── 错误提示 ── */}
        {conflictMsg && (
          <Alert type="error" message={conflictMsg} showIcon style={{ marginBottom: 8 }} />
        )}
      </Form>

      {/* ── 频谱预览 ── */}
      {activeTransponder && (
        <>
          <Divider style={{ borderColor: DARK.border, margin: '4px 0 10px' }} />
          <div style={{ color: DARK.muted, fontSize: 12, marginBottom: 6 }}>频谱占用预览</div>
          <SpectrumChart
            rxStartFreq={activeTransponder.rxStartFreq}
            rxEndFreq={activeTransponder.rxEndFreq}
            txStartFreq={activeTransponder.txStartFreq}
            txEndFreq={activeTransponder.txEndFreq}
            channelBw={activeTransponder.channelBw}
            occupations={existingOccs}
            transponderName={activeTransponder.transponderName}
            previewOcc={previewOcc}
            switchOff={activeTransponder.switchStatus !== 1}
          />
        </>
      )}
    </Modal>
  );
}
