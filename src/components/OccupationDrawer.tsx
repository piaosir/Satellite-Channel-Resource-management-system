import { useEffect, useState, useCallback } from 'react';
import {
  Drawer, Descriptions, Tag, Table, Badge,
  Button, Space, Popconfirm, Tooltip, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { queryOccupations, deleteOccupation } from '@/db/queries';
import { PERMISSIONS } from '@/utils/roleGuard';
import OccupationForm from './OccupationForm';
import SpectrumChart from './SpectrumChart';
import type { Transponder, Occupation } from '@/types';
import { calcOccFreq, fmtFreq } from '@/utils/freqCalc';

const STATUS_COLOR: Record<string, string> = { 占用: 'blue', 空闲: 'default', 干扰: 'error' };

function msToStr(ms: number | null): string {
  if (ms == null) return '长期';
  return new Date(ms).toLocaleString('zh-CN', { hour12: false });
}

interface OccupationDrawerProps {
  open: boolean;
  transponder: Transponder | null;
  /** 当前卫星全部转发器列表，供 OccupationForm 新建时选择 */
  transponders?: Transponder[];
  onClose: () => void;
  /** 占用数据发生变更后的回调（用于通知父页面刷新 occMap） */
  onOccChange?: () => void;
}

export default function OccupationDrawer({
  open, transponder, transponders = [], onClose, onOccChange,
}: OccupationDrawerProps) {
  const { db, role } = useStore();
  const [occs, setOccs] = useState<Occupation[]>([]);

  // 表单 Modal 状态
  const [formOpen, setFormOpen]       = useState(false);
  const [editRecord, setEditRecord]   = useState<Occupation | null>(null);

  const canManage = role != null && PERMISSIONS.canManageOccupation(role);
  const canDelete = role != null && PERMISSIONS.canDeleteOccupation(role);

  const reload = useCallback(() => {
    if (!db || !transponder) return;
    setOccs(queryOccupations(db, transponder.switchId));
  }, [db, transponder]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

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
          render: (_: unknown, occ: Occupation) => (
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
        } as ColumnsType<Occupation>[number]]
      : []),
  ];

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{transponder ? `转发器详情 — ${transponder.transponderName}` : '转发器详情'}</span>
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
            {/* ── 转发器基本信息 ── */}
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
              <Descriptions.Item label="极化">{transponder.polarization ?? '—'}</Descriptions.Item>
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
function OccSummaryBar({ occs, channelBw }: { occs: Occupation[]; channelBw: number | null }) {
  if (channelBw == null) return null;

  const totalOcc = occs.reduce((s, o) => s + o.occupiedBandwidth, 0);
  const usedRatio = Math.min(1, totalOcc / channelBw);

  const byStatus = occs.reduce<Record<string, number>>((acc, o) => {
    acc[o.occupationStatus] = (acc[o.occupationStatus] ?? 0) + o.occupiedBandwidth;
    return acc;
  }, {});

  const STATUS_FILL: Record<string, string> = { 占用: '#1677ff', 空闲: '#52c41a', 干扰: '#ff4d4f' };

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
          return (
            <div key={i} style={{
              position: 'absolute',
              left: `${left}%`,
              width: `${width}%`,
              height: '100%',
              background: STATUS_FILL[o.occupationStatus] ?? '#475569',
              opacity: 0.9,
            }} />
          );
        })}
      </div>
      {/* 图例 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {Object.entries(byStatus).map(([status, bw]) => (
          <span key={status} style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_FILL[status] ?? '#475569', display: 'inline-block' }} />
            {status}：{bw.toFixed(1)} MHz
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

