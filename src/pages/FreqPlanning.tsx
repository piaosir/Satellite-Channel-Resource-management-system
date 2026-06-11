/**
 * 频率规划 — 通道规划状态(基底层)
 * 车道图:通道基准 + 规划块(按用途着色);支持新建/调整用途/置无效/删除。
 * 规划是分配的前提:没规划的频率不能分配。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Card, Space, Select, Spin, Drawer, Descriptions, Button, Modal, Form,
  InputNumber, message, Tag, Popconfirm, Typography, Alert, Divider,
} from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import {
  fetchChannels, fetchPlanningBlocks, fetchSatelliteDetail,
  createPlanningBlock, updatePlanningBlock, deletePlanningBlock,
  fetchAllocationBlocksOfPlanning,
} from '@/api';
import type { Channel, PlanningBlock, Satellite, UsageType, AllocationBlock } from '@/types';
import { buildLanes, USAGE_COLORS, fmtRange, beamNameMap, beamLabel } from '@/utils/freq';
import FreqLaneBoard, { LaneLegend } from '@/components/FreqLaneBoard';
import AllocationContextViz from '@/components/AllocationContextViz';
import AllocationEditorModal from '@/components/AllocationEditorModal';

const cardStyle = { background: '#0c1a2e', border: '1px solid #1e3a5f' };
const USAGE_OPTIONS = (Object.keys(USAGE_COLORS) as UsageType[]).map((u) => ({ value: u, label: u }));

export default function FreqPlanning() {
  const { selectedSatelliteId, dataVersion, bumpDataVersion } = useStore();
  const [sat, setSat] = useState<Satellite | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [blocks, setBlocks] = useState<PlanningBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [usageFilter, setUsageFilter] = useState<UsageType | undefined>();
  const [laneFilter, setLaneFilter] = useState<string | undefined>();

  const [sel, setSel] = useState<PlanningBlock | null>(null);
  const [selAllocs, setSelAllocs] = useState<AllocationBlock[]>([]);
  const [allocTarget, setAllocTarget] = useState<PlanningBlock | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [freqForm] = Form.useForm();

  /** 从详情发起分配(没规划的不能分,无效/禁用规划块不可分配) */
  const startAllocate = (p: PlanningBlock) => {
    if (p.isValid !== 1) { message.warning('该规划块已无效,不能在其上分配'); return; }
    if (p.usageType === '禁用') { message.warning('禁用类规划块不能分配'); return; }
    setAllocTarget(p);
  };

  const openDetail = async (p: PlanningBlock) => {
    setSel(p);
    freqForm.setFieldsValue({
      uplinkStartFreq: p.uplinkStartFreq, uplinkEndFreq: p.uplinkEndFreq,
      downlinkStartFreq: p.downlinkStartFreq, downlinkEndFreq: p.downlinkEndFreq,
    });
    try { setSelAllocs(await fetchAllocationBlocksOfPlanning(p.id)); } catch { setSelAllocs([]); }
  };

  const saveFreq = async () => {
    if (!sel) return;
    const vals = await freqForm.validateFields();
    try {
      const r = await updatePlanningBlock(sel.id, vals);
      message.success(`频率已调整,新块代码:${r.blockCode}`);
      setSel(null); bumpDataVersion();
    } catch (e) { message.error((e as Error).message); }
  };

  useEffect(() => {
    if (!selectedSatelliteId) return;
    setLoading(true);
    Promise.all([
      fetchSatelliteDetail(selectedSatelliteId),
      fetchChannels(selectedSatelliteId),
      fetchPlanningBlocks(selectedSatelliteId),
    ])
      .then(([s, cs, ps]) => { setSat(s); setChannels(cs); setBlocks(ps); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSatelliteId, dataVersion]);

  const lanes = useMemo(() => {
    const filtered = usageFilter ? blocks.filter((b) => b.usageType === usageFilter) : blocks;
    return buildLanes(channels, filtered, []);
  }, [channels, blocks, usageFilter]);

  // 波束代号 → 中文波束名(取自通道组清单);新建表单的波束下拉选项
  const beamNames = useMemo(() => beamNameMap(channels), [channels]);
  const beamOptions = useMemo(() =>
    Object.entries(beamNames).map(([code, name]) => ({ value: code, label: `${name}[${code}]` })),
  [beamNames]);

  const visibleLanes = laneFilter ? lanes.filter((l) => l.key === laneFilter) : lanes;

  const doCreate = async () => {
    const vals = await form.validateFields();
    try {
      const r = await createPlanningBlock({ ...vals, satelliteCode: sat?.satelliteCode });
      message.success(`规划块已创建:${r.blockCode}`);
      setCreateOpen(false);
      form.resetFields();
      bumpDataVersion();
    } catch (e) { message.error((e as Error).message); }
  };

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card size="small" style={cardStyle}>
        <Space wrap>
          <Select allowClear placeholder="用途筛选" style={{ width: 120 }}
            value={usageFilter} onChange={setUsageFilter} options={USAGE_OPTIONS} />
          <Select allowClear placeholder="波束/极化车道" style={{ width: 230 }}
            value={laneFilter} onChange={setLaneFilter}
            options={lanes.map((l) => ({
              value: l.key,
              label: `${l.beamName ?? l.beam} · ${l.polarization} 极化`,
            }))} />
          <span style={{ color: '#4a6a8a', fontSize: 12 }}>
            规划块 {blocks.length} · 有效 {blocks.filter((b) => b.isValid === 1).length}
          </span>
          <span style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建规划块
          </Button>
        </Space>
        <LaneLegend />
      </Card>

      <Spin spinning={loading}>
        <FreqLaneBoard lanes={visibleLanes} onPlanningClick={openDetail} />
      </Spin>

      {/* 规划块详情(可直接操作:分配/改用途/改频率/置无效/删除) */}
      <Drawer open={!!sel} onClose={() => setSel(null)} width={560}
        title={`规划块 #${sel?.id}`}
        extra={
          <Button type="primary" size="small"
            onClick={() => sel && startAllocate(sel)}>
            在此规划内分配
          </Button>
        }>
        {sel && (
          <>
            {/* 块内分配占位上下文 */}
            <div style={{ color: '#4a6a8a', fontSize: 11, marginBottom: 6 }}>
              块内分配占位({selAllocs.length} 个分配块)
            </div>
            <AllocationContextViz planning={sel} siblings={selAllocs} beamNames={beamNames} />

            <Descriptions size="small" column={2} bordered style={{ marginTop: 14 }}
              labelStyle={{ color: '#4a6a8a', width: 92 }}>
              <Descriptions.Item label="用途">
                <Tag color={sel.usageType ? USAGE_COLORS[sel.usageType] : undefined}>{sel.usageType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="有效性">
                <Tag color={sel.isValid === 1 ? 'green' : 'red'}>{sel.isValid === 1 ? '有效' : '无效'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="上行" span={2}>
                {beamLabel(beamNames, sel.uplinkBeam)} · {sel.uplinkPolarization} 极化 ·{' '}
                <span style={{ fontFamily: 'monospace' }}>{fmtRange(sel.uplinkStartFreq, sel.uplinkEndFreq)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="下行" span={2}>
                {beamLabel(beamNames, sel.downlinkBeam)} · {sel.downlinkPolarization} 极化 ·{' '}
                <span style={{ fontFamily: 'monospace' }}>{fmtRange(sel.downlinkStartFreq, sel.downlinkEndFreq)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="带宽">{sel.bandwidth} MHz</Descriptions.Item>
              <Descriptions.Item label="所落通道">{sel.commonName ?? sel.channelShortName ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="块代码" span={2}>
                <Typography.Text copyable style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {sel.blockCode}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="最后更新" span={2}>{sel.updateTime ?? '—'}</Descriptions.Item>
            </Descriptions>

            {/* ── 状态操作 ── */}
            <Divider titlePlacement="start" style={{ fontSize: 12, color: '#4a6a8a', margin: '18px 0 10px' }}>
              状态操作
            </Divider>
            <Space wrap>
              <span style={{ color: '#4a6a8a', fontSize: 12 }}>用途</span>
              <Select size="small" style={{ width: 100 }} value={sel.usageType ?? undefined}
                options={USAGE_OPTIONS}
                onChange={async (v) => {
                  try {
                    await updatePlanningBlock(sel.id, { usageType: v });
                    message.success('用途已调整');
                    setSel(null); bumpDataVersion();
                  } catch (e) { message.error((e as Error).message); }
                }} />
              <Button size="small" onClick={async () => {
                try {
                  await updatePlanningBlock(sel.id, { isValid: sel.isValid === 1 ? 0 : 1 });
                  message.success(sel.isValid === 1 ? '已置无效' : '已恢复有效');
                  setSel(null); bumpDataVersion();
                } catch (e) { message.error((e as Error).message); }
              }}>
                {sel.isValid === 1 ? '置为无效' : '恢复有效'}
              </Button>
              <Popconfirm title="删除该规划块?" description="其下存在分配块时将被拒绝"
                onConfirm={async () => {
                  try {
                    await deletePlanningBlock(sel.id);
                    message.success('已删除');
                    setSel(null); bumpDataVersion();
                  } catch (e) { message.error((e as Error).message); }
                }}>
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </Space>

            {/* ── 频率调整 ── */}
            <Divider titlePlacement="start" style={{ fontSize: 12, color: '#4a6a8a', margin: '18px 0 10px' }}>
              频率调整
            </Divider>
            {selAllocs.length > 0 && (
              <Alert type="info" showIcon style={{ marginBottom: 10 }}
                message={`该规划块下有 ${selAllocs.length} 个分配块,调整范围不能使其越界`} />
            )}
            <Form form={freqForm} layout="inline" style={{ rowGap: 10 }}>
              <Form.Item name="uplinkStartFreq" label="上行起始" rules={[{ required: true }]}>
                <InputNumber style={{ width: 120 }} step={0.5} addonAfter="M" />
              </Form.Item>
              <Form.Item name="uplinkEndFreq" label="上行终止" rules={[{ required: true }]}>
                <InputNumber style={{ width: 120 }} step={0.5} addonAfter="M" />
              </Form.Item>
              <Form.Item name="downlinkStartFreq" label="下行起始" rules={[{ required: true }]}>
                <InputNumber style={{ width: 120 }} step={0.5} addonAfter="M" />
              </Form.Item>
              <Form.Item name="downlinkEndFreq" label="下行终止" rules={[{ required: true }]}>
                <InputNumber style={{ width: 120 }} step={0.5} addonAfter="M" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" size="small" icon={<SaveOutlined />} onClick={saveFreq}>
                  保存频率
                </Button>
              </Form.Item>
            </Form>
            <div style={{ color: '#4a6a8a', fontSize: 11, marginTop: 8 }}>
              保存后块代码将按新频率重新生成,所落通道自动重新解析。
            </div>
          </>
        )}
      </Drawer>

      {/* 新建规划块 */}
      <Modal
        open={createOpen} title={`新建规划块 — ${sat?.satelliteCode ?? ''}`}
        onCancel={() => setCreateOpen(false)} onOk={doCreate} okText="创建" width={620}
      >
        <Form form={form} layout="vertical" initialValues={{ usageType: '出租', isValid: 1 }}>
          <Space size="middle" wrap>
            <Form.Item name="usageType" label="用途" rules={[{ required: true }]}>
              <Select style={{ width: 110 }} options={USAGE_OPTIONS} />
            </Form.Item>
            <Form.Item name="uplinkPolarization" label="上行极化" rules={[{ required: true }]}>
              <Select style={{ width: 90 }} options={['H', 'V', 'L', 'R', 'X', 'Y'].map((p) => ({ value: p, label: p }))} />
            </Form.Item>
            <Form.Item name="uplinkBeam" label="上行波束" rules={[{ required: true }]}>
              <Select style={{ width: 170 }} showSearch optionFilterProp="label"
                placeholder="选择波束" options={beamOptions} />
            </Form.Item>
            <Form.Item name="uplinkStartFreq" label="上行起始(MHz)" rules={[{ required: true }]}>
              <InputNumber style={{ width: 130 }} step={0.5} />
            </Form.Item>
            <Form.Item name="uplinkEndFreq" label="上行终止(MHz)" rules={[{ required: true }]}>
              <InputNumber style={{ width: 130 }} step={0.5} />
            </Form.Item>
          </Space>
          <Space size="middle" wrap>
            <Form.Item name="downlinkPolarization" label="下行极化" rules={[{ required: true }]}>
              <Select style={{ width: 90 }} options={['H', 'V', 'L', 'R', 'X', 'Y'].map((p) => ({ value: p, label: p }))} />
            </Form.Item>
            <Form.Item name="downlinkBeam" label="下行波束" rules={[{ required: true }]}>
              <Select style={{ width: 170 }} showSearch optionFilterProp="label"
                placeholder="选择波束" options={beamOptions} />
            </Form.Item>
            <Form.Item name="downlinkStartFreq" label="下行起始(MHz)" rules={[{ required: true }]}>
              <InputNumber style={{ width: 130 }} step={0.5} />
            </Form.Item>
            <Form.Item name="downlinkEndFreq" label="下行终止(MHz)" rules={[{ required: true }]}>
              <InputNumber style={{ width: 130 }} step={0.5} />
            </Form.Item>
            <Form.Item shouldUpdate label="带宽" style={{ minWidth: 90 }}>
              {() => {
                const s = form.getFieldValue('uplinkStartFreq');
                const e = form.getFieldValue('uplinkEndFreq');
                const bw = s != null && e != null ? +(e - s).toFixed(2) : null;
                if (bw != null) form.setFieldValue('bandwidth', bw);
                return <Tag>{bw != null ? `${bw} MHz` : '—'}</Tag>;
              }}
            </Form.Item>
            <Form.Item name="bandwidth" hidden><InputNumber /></Form.Item>
          </Space>
          <div style={{ color: '#4a6a8a', fontSize: 11 }}>
            块代码将由服务端按格式自动拼装;规划是分配的前提,创建后才能在其范围内分配。
          </div>
        </Form>
      </Modal>

      {/* 在规划块内分配(与「频率分配和登记」页共用同一弹窗) */}
      <AllocationEditorModal
        planning={allocTarget}
        siblings={selAllocs}
        beamNames={beamNames}
        onClose={() => setAllocTarget(null)}
        onSaved={() => { setSel(null); bumpDataVersion(); }}
      />
    </div>
  );
}
