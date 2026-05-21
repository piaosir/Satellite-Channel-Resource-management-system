import { useEffect, useState, useCallback } from 'react';
import {
  Drawer, Descriptions, Tag, Table, Badge,
  Button, Space, Popconfirm, Tooltip, message, Input,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  InfoCircleOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { fetchFrequencyBlocks, deleteFrequencyBlock, updateChannelCommonName } from '@/api';
import { PERMISSIONS } from '@/utils/roleGuard';
import OccupationForm from './OccupationForm';
import SpectrumChart from './SpectrumChart';
import type { Transponder, FrequencyBlock } from '@/types';
import { calcOccFreq, fmtFreq, fmtPolarization } from '@/utils/freqCalc';

const STATUS_COLOR: Record<string, string> = { P: 'blue', R: 'default', '禁用': 'error' };
function occStatusLabel(occ: FrequencyBlock) {
  if (occ.usageType === '禁用') return '禁用';
  return occ.partitionStatus === 'P' ? occ.usageType ?? '划分' : '空闲';
}
function occStatusColor(occ: FrequencyBlock) {
  if (occ.usageType === '禁用') return 'error';
  return occ.partitionStatus === 'P' ? 'blue' : 'default';
}

interface OccupationDrawerProps {
  open: boolean;
  transponder: Transponder | null;
  /** 当前卫星全部转发器列表，供 OccupationForm 新建时选择 */
  transponders?: Transponder[];
  onClose: () => void;
  /** 占用数据发生变更后的回调（用于通知父页面刷新 occMap） */
  onOccChange?: () => void;
  /** 通道名称修改后的回调（用于通知父页面刷新转发器列表） */
  onTransponderChange?: () => void;
}

export default function OccupationDrawer({
  open, transponder, transponders = [], onClose, onOccChange, onTransponderChange,
}: OccupationDrawerProps) {
  const { db, role } = useStore();
  const [occs, setOccs] = useState<Occupation[]>([]);

  // 表单 Modal 状态
  const [formOpen, setFormOpen]       = useState(false);
  const [editRecord, setEditRecord]   = useState<Occupation | null>(null);

  // 通道名称编辑状态
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState('');
  const [savingName, setSavingName]   = useState(false);

  const canManage = role != null && PERMISSIONS.canManageOccupation(role);
  const canDelete = role != null && PERMISSIONS.canDeleteOccupation(role);
  const canEditName = role != null && PERMISSIONS.canEditChannelName(role);

  const reload = useCallback(() => {
    if (!db || !transponder) return;
    setOccs(queryOccupations(db, transponder.switchId));
  }, [db, transponder]);

  useEffect(() => {
    if (open) reload();
    else setEditingName(false);
  }, [open, reload]);

  useEffect(() => {
    setEditingName(false);
  }, [transponder?.switchId]);

  function handleFormSuccess() {
    reload();
    onOccChange?.();
    message.success(editRecord ? '占用已更新' : '占用已新建');
  }

  function handleDelete(id: number) {
    if (!db) return;
    deleteOccupation(db, id);
    reload();
    onOccChange?.();
    message.success('已删除');
  }

  async function handleSaveName() {
    if (!transponder || !nameInput.trim()) return;
    setSavingName(true);
    try {
      await updateChannelCommonName(transponder.inputChannelId, nameInput.trim());
      message.success('通道名称已更新');
      setEditingName(false);
      onTransponderChange?.();
    } catch (e) {
      message.error((e as Error).message ?? '保存失败');
    } finally {
      setSavingName(false);
    }
  }

  function openCreate() {
    setEditRecord(null);
    setFormOpen(true);
  }

  function openEdit(occ: Occupation) {
    setEditRecord(occ);
    setFormOpen(true);
  }

  // ── 占用记录表格列 ──────────────────────────────────────────
  const columns: ColumnsType<Occupation> = [
    {
      title: '上行频率段',
      render: (_, occ) => {
        if (transponder?.rxStartFreq == null) return '—';
        const f = calcOccFreq(occ, transponder.rxStartFreq, transponder.txStartFreq, transponder.channelBw);
        return (
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {f.rxStart.toFixed(3)} ~ {f.rxEnd.toFixed(3)} MHz
          </span>
        );
      },
    },
    {
      title: '下行频率段',
      render: (_, occ) => {
        if (transponder?.txStartFreq == null) return '—';
        const f = calcOccFreq(occ, transponder.rxStartFreq, transponder.txStartFreq, transponder.channelBw);
        return (
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {f.txStart.toFixed(3)} ~ {f.txEnd.toFixed(3)} MHz
          </span>
        );
      },
    },
    {
      title: '带宽',
      dataIndex: 'occupiedBandwidth',
      render: (v) => `${fmtFreq(v)} MHz`,
      width: 76,
    },
    {
      title: '偏移量',
      dataIndex: 'frequencyOffset',
      render: (v) => `${fmtFreq(v)} MHz`,
      width: 76,
    },
    {
      title: '状态',
      dataIndex: 'occupationStatus',
      render: (v) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
      width: 68,
    },
    {
      title: '频率块代码',
      dataIndex: 'frequencyBlockCode',
      ellipsis: true,
      width: 120,
    },
    {
      title: (
        <Tooltip title="占用起止时间">
          <span>起止时间 <InfoCircleOutlined /></span>
        </Tooltip>
      ),
      width: 130,
      render: (_, occ) => (
        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
          <div style={{ color: '#94a3b8' }}>起：{occ.occupationStartTimeMs ? msToStr(occ.occupationStartTimeMs) : '—'}</div>
          <div style={{ color: occ.occupationEndTimeMs ? '#94a3b8' : '#f59e0b' }}>
            止：{msToStr(occ.occupationEndTimeMs)}
          </div>
        </div>
      ),
    },
    // 操作列只在有权限时追加
    ...(canManage || canDelete
      ? [{
          title: '操作',
          width: 80,
          render: (_: unknown, occ: FrequencyBlock) => (
            <Space size={2}>
              {canManage && (
                <Tooltip title="编辑">
                  <Button
                    type="text" size="small"
                    icon={<EditOutlined />}
                    style={{ color: '#60a5fa' }}
                    onClick={() => openEdit(occ)}
                  />
                </Tooltip>
              )}
              {canDelete && (
                <Popconfirm
                  title="确认删除该占用记录？"
                  onConfirm={() => handleDelete(occ.id)}
                  okText="删除" cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="删除">
                    <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          ),
        } as ColumnsType<FrequencyBlock>[number]]
      : []),
  ];

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{transponder ? `通道详情 — ${transponder.transponderName}` : '通道详情'}</span>
            {canManage && transponder && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={openCreate}
                style={{ marginRight: 32 }}
              >
                新建占用
              </Button>
            )}
          </div>
        }
        open={open}
        onClose={onClose}
        size="large"
        styles={{
          body: { background: '#0f172a', padding: 20 },
          header: { background: '#1e293b', borderBottom: '1px solid #334155', color: '#e2e8f0' },
        }}
      >
        {transponder && (
          <>
            {/* ── 通道基本信息 ── */}
            <Descriptions
              size="small"
              column={2}
              labelStyle={{ color: '#64748b' }}
              contentStyle={{ color: '#e2e8f0' }}
              style={{ marginBottom: 20 }}
            >
              <Descriptions.Item label="开关代码">{transponder.switchCode}</Descriptions.Item>
              <Descriptions.Item label="开关状态">
                <Badge
                  status={transponder.switchStatus === 1 ? 'success' : 'error'}
                  text={transponder.switchStatus === 1 ? '开' : '关'}
                />
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
                  ? `${transponder.rxStartFreq} ~ ${transponder.rxEndFreq} MHz`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="下行频率">
                {transponder.txStartFreq != null
                  ? `${transponder.txStartFreq} ~ ${transponder.txEndFreq} MHz`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="通道带宽">
                {transponder.channelBw != null ? `${transponder.channelBw} MHz` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="TWT">{transponder.twtValidStatusCode ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="通道名称" span={2}>
                {editingName ? (
                  <Space size={4}>
                    <Input
                      size="small"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onPressEnter={handleSaveName}
                      style={{ width: 200 }}
                      autoFocus
                    />
                    <Button
                      type="text" size="small" icon={<CheckOutlined />}
                      style={{ color: '#4ade80' }}
                      loading={savingName}
                      onClick={handleSaveName}
                    />
                    <Button
                      type="text" size="small" icon={<CloseOutlined />}
                      style={{ color: '#94a3b8' }}
                      onClick={() => setEditingName(false)}
                    />
                  </Space>
                ) : (
                  <Space size={4}>
                    <span>{transponder.transponderName}</span>
                    {canEditName && (
                      <Button
                        type="text" size="small" icon={<EditOutlined />}
                        style={{ color: '#60a5fa' }}
                        onClick={() => { setNameInput(transponder.transponderName); setEditingName(true); }}
                      />
                    )}
                  </Space>
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* ── 占用统计条 ── */}
            <OccSummaryBar occs={occs} channelBw={transponder.channelBw} />

            {/* ── 频谱图 ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>频谱占用示意</div>
              <SpectrumChart
                rxStartFreq={transponder.rxStartFreq}
                rxEndFreq={transponder.rxEndFreq}
                txStartFreq={transponder.txStartFreq}
                txEndFreq={transponder.txEndFreq}
                channelBw={transponder.channelBw}
                occupations={occs}
                transponderName={transponder.transponderName}
                switchOff={transponder.switchStatus !== 1}
              />
            </div>

            {/* ── 占用列表 ── */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>
                占用记录（共 {occs.length} 条）
              </span>
            </div>
            <Table
              size="small"
              columns={columns}
              dataSource={occs}
              rowKey="id"
              pagination={false}
              scroll={{ x: true }}
              style={{ background: '#1e293b', borderRadius: 8 }}
            />
          </>
        )}
      </Drawer>

      {/* 新建 / 编辑表单 Modal */}
      {transponder && (
        <OccupationForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={handleFormSuccess}
          editRecord={editRecord}
          transponders={transponders.length > 0 ? transponders : [transponder]}
          initTransponder={editRecord ? null : transponder}
        />
      )}
    </>
  );
}

// ── 占用统计条（带宽利用率摘要） ─────────────────────────────
function OccSummaryBar({ occs, channelBw }: { occs: FrequencyBlock[]; channelBw: number | null }) {
  if (channelBw == null) return null;

  const totalOcc = occs.reduce((s, o) => s + o.occupiedBandwidth, 0);
  const usedRatio = Math.min(1, totalOcc / channelBw);

  const STATUS_FILL: Record<string, string> = { P: '#1677ff', R: '#52c41a', '禁用': '#ff4d4f' };

  const byStatus = occs.reduce<Record<string, number>>((acc, o) => {
    const key = o.usageType === '禁用' ? '禁用' : o.partitionStatus;
    acc[key] = (acc[key] ?? 0) + o.occupiedBandwidth;
    return acc;
  }, {});
  const labelMap: Record<string, string> = { P: '划分', R: '空闲', '禁用': '禁用' };

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: 8,
      padding: '10px 14px',
      marginBottom: 20,
      border: '1px solid #334155',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>频段利用率</span>
        <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
          {totalOcc.toFixed(1)} / {channelBw} MHz（{(usedRatio * 100).toFixed(1)}%）
        </span>
      </div>
      {/* 进度条 */}
      <div style={{ height: 10, background: '#0f172a', borderRadius: 5, overflow: 'hidden', position: 'relative', marginBottom: 8 }}>
        {occs.map((o, i) => {
          const left  = Math.max(0, Math.min(100, (o.frequencyOffset / channelBw) * 100));
          const width = Math.max(1, Math.min(100 - left, (o.occupiedBandwidth / channelBw) * 100));
          const key   = o.usageType === '禁用' ? '禁用' : o.partitionStatus;
          return (
            <div key={i} style={{
              position: 'absolute',
              left: `${left}%`,
              width: `${width}%`,
              height: '100%',
              background: STATUS_FILL[key] ?? '#475569',
              opacity: 0.9,
            }} />
          );
        })}
      </div>
      {/* 图例 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {Object.entries(byStatus).map(([key, bw]) => (
          <span key={key} style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_FILL[key] ?? '#475569', display: 'inline-block' }} />
            {labelMap[key] ?? key}：{bw.toFixed(1)} MHz
          </span>
        ))}
        {occs.length === 0 && (
          <span style={{ fontSize: 11, color: '#475569' }}>暂无占用记录</span>
        )}
        <span style={{ fontSize: 11, color: '#334155', marginLeft: 'auto' }}>
          剩余空闲：{(channelBw - totalOcc).toFixed(1)} MHz
        </span>
      </div>
    </div>
  );
}

