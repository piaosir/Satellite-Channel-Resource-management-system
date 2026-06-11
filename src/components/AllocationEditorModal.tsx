/**
 * 分配操作弹窗 — 新建 / 编辑一体(频率规划、频率分配和登记 两页共用)
 * ------------------------------------------------------------------
 *  · 新建分配块:在规划块空隙内切分并登记块信息(写入通道分配状态)
 *  · 编辑已有块:选中空闲分配块直接调整频率(图上点块即选中);
 *    占用中的块不可编辑(须先登记释放)
 *  空隙点选 / 频标游标 / 实时预览 / 重叠告警 对两种模式同样生效。
 */
import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, InputNumber, Tag, Alert, message, Segmented, Select } from 'antd';
import { createAllocationBlock, updateAllocationBlock } from '@/api';
import type { PlanningBlock, AllocationBlock } from '@/types';
import { USAGE_COLORS, computeGaps, fmtRange, beamLabel, allocStatusText } from '@/utils/freq';
import AllocationContextViz from '@/components/AllocationContextViz';

type Mode = 'create' | 'edit';

const isOccupied = (b: AllocationBlock) =>
  (b.contractBalance ?? 0) > 0 || (b.carrierBalance ?? 0) > 0;

interface Props {
  planning: PlanningBlock | null;
  siblings: AllocationBlock[];          // 该规划块下既有分配块
  beamNames?: Record<string, string>;
  /** 打开时直接进入编辑模式并选中该块(可选) */
  initialEditId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AllocationEditorModal({
  planning, siblings, beamNames = {}, initialEditId = null, onClose, onSaved,
}: Props) {
  const [form] = Form.useForm();
  const [mode, setMode] = useState<Mode>('create');
  const [editId, setEditId] = useState<number | null>(null);
  const prevUs = Form.useWatch('uplinkStartFreq', form);
  const prevUe = Form.useWatch('uplinkEndFreq', form);

  const editBlock = useMemo(
    () => (editId != null ? siblings.find((s) => s.id === editId) ?? null : null),
    [editId, siblings]);
  const editOccupied = !!editBlock && isOccupied(editBlock);

  const gaps = useMemo(() => {
    if (!planning || planning.uplinkStartFreq == null || planning.uplinkEndFreq == null) return [];
    // 编辑模式下,被编辑块自身占的频段视作可用
    return computeGaps(Number(planning.uplinkStartFreq), Number(planning.uplinkEndFreq),
      siblings
        .filter((s) => s.uplinkStartFreq != null && s.uplinkEndFreq != null
          && !(mode === 'edit' && s.id === editId))
        .map((s) => ({ us: Number(s.uplinkStartFreq), ue: Number(s.uplinkEndFreq) })));
  }, [planning, siblings, mode, editId]);

  const overlapped = useMemo(() => {
    if (prevUs == null || prevUe == null || prevUe <= prevUs) return [];
    return siblings.filter((s) =>
      !(mode === 'edit' && s.id === editId)
      && s.uplinkStartFreq != null && s.uplinkEndFreq != null
      && Number(s.uplinkStartFreq) < prevUe - 0.001 && prevUs + 0.001 < Number(s.uplinkEndFreq));
  }, [siblings, prevUs, prevUe, mode, editId]);

  /** 选中已有块进入编辑 */
  const pickForEdit = (b: AllocationBlock) => {
    if (isOccupied(b)) {
      message.warning(`分配块 #${b.id} 正被占用,不能编辑,请先登记释放`);
      return;
    }
    setMode('edit');
    setEditId(b.id);
    form.setFieldsValue({ uplinkStartFreq: b.uplinkStartFreq, uplinkEndFreq: b.uplinkEndFreq });
  };

  const fillBiggestGap = () => {
    if (!planning) return;
    const biggest = [...gaps].sort((a, b) => (b.ue - b.us) - (a.ue - a.us))[0];
    form.setFieldsValue(biggest
      ? { uplinkStartFreq: +biggest.us.toFixed(2), uplinkEndFreq: +biggest.ue.toFixed(2) }
      : { uplinkStartFreq: planning.uplinkStartFreq, uplinkEndFreq: planning.uplinkEndFreq });
  };

  // 打开 / 切换规划块时初始化
  useEffect(() => {
    if (!planning) return;
    const init = initialEditId != null ? siblings.find((s) => s.id === initialEditId) : null;
    if (init && !isOccupied(init)) {
      setMode('edit');
      setEditId(init.id);
      form.setFieldsValue({ uplinkStartFreq: init.uplinkStartFreq, uplinkEndFreq: init.uplinkEndFreq });
    } else {
      setMode('create');
      setEditId(null);
      fillBiggestGap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planning?.id, initialEditId]);

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'create') {
      setEditId(null);
      fillBiggestGap();
    } else {
      const firstIdle = siblings.find((s) => !isOccupied(s));
      if (firstIdle) {
        setEditId(firstIdle.id);
        form.setFieldsValue({
          uplinkStartFreq: firstIdle.uplinkStartFreq, uplinkEndFreq: firstIdle.uplinkEndFreq,
        });
      } else {
        setEditId(null);
      }
    }
  };

  const doSave = async () => {
    if (!planning) return;
    const vals = await form.validateFields();
    const us = vals.uplinkStartFreq as number;
    const ue = vals.uplinkEndFreq as number;
    if (us >= ue) { message.error('起始频率必须小于终止频率'); return; }
    if (us < (planning.uplinkStartFreq ?? -Infinity) - 0.01
        || ue > (planning.uplinkEndFreq ?? Infinity) + 0.01) {
      message.error('范围必须落在规划块内(没规划的不能分)');
      return;
    }
    try {
      if (mode === 'edit') {
        if (editId == null) { message.error('请先选择要编辑的分配块'); return; }
        const r = await updateAllocationBlock(editId, { uplinkStartFreq: us, uplinkEndFreq: ue });
        message.success(`分配块 #${editId} 已修改:${r.blockCode}`);
      } else {
        const shift = us - (planning.uplinkStartFreq ?? us);
        const ds = (planning.downlinkStartFreq ?? 0) + shift;
        const de = ds + (ue - us);
        const r = await createAllocationBlock({
          planningBlockId: planning.id,
          satelliteCode: planning.satelliteCode,
          bandwidth: +(ue - us).toFixed(2),
          uplinkPolarization: planning.uplinkPolarization,
          uplinkBeam: planning.uplinkBeam,
          uplinkStartFreq: us,
          uplinkEndFreq: ue,
          downlinkPolarization: planning.downlinkPolarization,
          downlinkBeam: planning.downlinkBeam,
          downlinkStartFreq: +ds.toFixed(2),
          downlinkEndFreq: +de.toFixed(2),
        });
        message.success(`分配块已登记到通道分配状态:${r.blockCode}`);
      }
      onSaved();
      onClose();
    } catch (e) { message.error((e as Error).message); }
  };

  const okDisabled = overlapped.length > 0
    || (mode === 'edit' && (editId == null || editOccupied));

  return (
    <Modal
      open={!!planning}
      title={`在规划块 #${planning?.id} 内分配(新建 / 编辑块信息)`}
      onCancel={onClose}
      onOk={doSave}
      okText={mode === 'edit' ? '保存块修改' : '创建并登记分配块'}
      okButtonProps={{ disabled: okDisabled }}
      width={660}
      destroyOnHidden
    >
      {planning && (
        <>
          <div style={{ color: '#4a6a8a', fontSize: 11, marginBottom: 8 }}>
            {beamLabel(beamNames, planning.uplinkBeam)} · {planning.uplinkPolarization} 极化 · 规划用途
            <Tag style={{ margin: '0 6px' }}
              color={planning.usageType ? USAGE_COLORS[planning.usageType] : undefined}>
              {planning.usageType}
            </Tag>
            <span style={{ fontFamily: 'monospace' }}>
              {fmtRange(planning.uplinkStartFreq, planning.uplinkEndFreq)}
            </span>
          </div>

          <Segmented
            value={mode}
            onChange={(v) => switchMode(v as Mode)}
            options={[
              { value: 'create', label: '新建分配块' },
              { value: 'edit', label: `编辑已有块(${siblings.length})` },
            ]}
            style={{ marginBottom: 8 }}
          />

          {mode === 'edit' && (
            <div style={{ margin: '4px 0 8px' }}>
              <span style={{ color: '#4a6a8a', fontSize: 12, marginRight: 8 }}>选择分配块</span>
              <Select
                style={{ width: 440 }} size="small" showSearch optionFilterProp="label"
                placeholder={siblings.length ? '选择要编辑的块(也可直接点击图中色块)' : '该规划块下暂无分配块'}
                value={editId ?? undefined}
                onChange={(id) => {
                  const b = siblings.find((s) => s.id === id);
                  if (b) pickForEdit(b);
                }}
                options={siblings.map((b) => ({
                  value: b.id,
                  disabled: isOccupied(b),
                  label: `#${b.id} ${fmtRange(b.uplinkStartFreq, b.uplinkEndFreq)} · ${b.bandwidth}M · ${allocStatusText(b)}${isOccupied(b) ? '(不可编辑)' : ''}`,
                }))}
              />
            </div>
          )}

          <div style={{ color: '#7da3c8', fontSize: 11, marginBottom: 6 }}>
            绿色虚线为空闲频段,点击即选用;金色虚线为
            {mode === 'edit' ? '修改后范围预览,金色描边为正在编辑的块' : '新分配块预览'};
            点击已有色块可直接切换为编辑该块。
          </div>

          <AllocationContextViz
            planning={planning}
            siblings={siblings}
            beamNames={beamNames}
            selfId={mode === 'edit' ? editId ?? undefined : undefined}
            preview={prevUs != null && prevUe != null && prevUe > prevUs ? { us: prevUs, ue: prevUe } : null}
            onGapClick={(g) => form.setFieldsValue({
              uplinkStartFreq: +g.us.toFixed(2),
              uplinkEndFreq: +g.ue.toFixed(2),
            })}
            onBlockClick={pickForEdit}
          />

          {gaps.length > 0 && (
            <div style={{ margin: '8px 0 2px' }}>
              <span style={{ color: '#4a6a8a', fontSize: 11, marginRight: 8 }}>空闲频段:</span>
              {gaps.map((g, i) => (
                <Tag key={i} style={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: 11 }}
                  color="green"
                  onClick={() => form.setFieldsValue({
                    uplinkStartFreq: +g.us.toFixed(2), uplinkEndFreq: +g.ue.toFixed(2),
                  })}>
                  {g.us.toFixed(2)}~{g.ue.toFixed(2)} ({(g.ue - g.us).toFixed(1)}M)
                </Tag>
              ))}
            </div>
          )}
          {gaps.length === 0 && mode === 'create' && (
            <Alert type="warning" showIcon style={{ margin: '8px 0' }}
              message="该规划块已无空闲频段;可切换到「编辑已有块」调整既有分配,或先删除部分分配块" />
          )}

          <Form form={form} layout="inline" style={{ marginTop: 10 }}>
            <Form.Item name="uplinkStartFreq" label="上行起始(MHz)" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: 140 }} step={0.5}
                min={planning.uplinkStartFreq ?? undefined}
                max={planning.uplinkEndFreq ?? undefined}
              />
            </Form.Item>
            <Form.Item name="uplinkEndFreq" label="上行终止(MHz)" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: 140 }} step={0.5}
                min={planning.uplinkStartFreq ?? undefined}
                max={planning.uplinkEndFreq ?? undefined}
              />
            </Form.Item>
            <Form.Item shouldUpdate label="带宽">
              {() => {
                const s = form.getFieldValue('uplinkStartFreq');
                const e = form.getFieldValue('uplinkEndFreq');
                return <Tag>{s != null && e != null && e > s ? `${(e - s).toFixed(2)} MHz` : '—'}</Tag>;
              }}
            </Form.Item>
          </Form>

          {overlapped.length > 0 && (
            <Alert type="error" showIcon style={{ marginTop: 10 }}
              message={`所选范围与既有分配块重叠:${overlapped.map((o) => `#${o.id}`).join('、')},请调整范围`} />
          )}
          <div style={{ color: '#4a6a8a', fontSize: 11, marginTop: 10 }}>
            下行频率按上下行成对关系自动平移;块代码由服务端拼装。
            {mode === 'edit'
              ? '修改后块代码会重新生成,历史占用/释放记录仍挂在该块上。'
              : '登记后即可在该块上登记占用/释放过程记录。'}
          </div>
        </>
      )}
    </Modal>
  );
}
