/**
 * 通道资源 — 通道组(波束/极化/频段/收发) → 通道清单
 * 每个通道组内以频率条可视化通道排布;支持改通道常用名、接收机主备切换。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Tag, Select, Input, Space, Collapse, Empty, Spin,
  Button, Modal, Form, message, Descriptions, Tooltip,
} from 'antd';
import { EditOutlined, SwapOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import {
  fetchChannelGroups, fetchChannels, updateChannelCommonName,
  switchReceiver, fetchReceiverLogs,
} from '@/api';
import type { Channel, ChannelGroup, ReceiverLog } from '@/types';
import { fmtRange } from '@/utils/freq';

const cardStyle = { background: '#0c1a2e', border: '1px solid #1e3a5f' };

/** 通道组内的频率条(频率计划逻辑表征) */
function GroupStrip({ channels }: { channels: Channel[] }) {
  const valid = channels.filter((c) => c.channelStartFreq != null && c.channelEndFreq != null);
  if (valid.length === 0) return null;
  const f0 = Math.min(...valid.map((c) => c.channelStartFreq!));
  const f1 = Math.max(...valid.map((c) => c.channelEndFreq!));
  const span = f1 - f0 || 1;
  return (
    <div style={{ position: 'relative', height: 34, background: '#0a1626', borderRadius: 4, margin: '6px 0 10px' }}>
      {valid.map((c) => {
        const left = ((c.channelStartFreq! - f0) / span) * 100;
        const w = ((c.channelEndFreq! - c.channelStartFreq!) / span) * 100;
        return (
          <Tooltip key={c.id}
            title={`${c.commonName ?? c.channelShortName} · ${fmtRange(c.channelStartFreq, c.channelEndFreq)} · ${c.channelBandwidth} MHz`}>
            <div style={{
              position: 'absolute', left: `${left}%`, width: `${w}%`, top: 4, bottom: 4,
              background: '#1d3a5f', border: '1px solid #3b82f6',
              borderRadius: 3, overflow: 'hidden', fontSize: 9, color: '#7da3c8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'monospace', whiteSpace: 'nowrap',
            }}>
              {w > 4 ? (c.commonName ?? c.channelShortName) : ''}
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default function ChannelResources() {
  const { selectedSatelliteId, dataVersion, bumpDataVersion } = useStore();
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [bandFilter, setBandFilter] = useState<string | undefined>();
  const [rxTxFilter, setRxTxFilter] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  // 改常用名
  const [editing, setEditing] = useState<Channel | null>(null);
  const [editName, setEditName] = useState('');

  // 接收机主备切换
  const [rcvGroup, setRcvGroup] = useState<ChannelGroup | null>(null);
  const [rcvForm] = Form.useForm();
  const [rcvLogs, setRcvLogs] = useState<ReceiverLog[]>([]);

  useEffect(() => {
    if (!selectedSatelliteId) return;
    setLoading(true);
    Promise.all([fetchChannelGroups(selectedSatelliteId), fetchChannels(selectedSatelliteId)])
      .then(([gs, cs]) => { setGroups(gs); setChannels(cs); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSatelliteId, dataVersion]);

  const bands = useMemo(() => [...new Set(groups.map((g) => g.band).filter(Boolean))] as string[], [groups]);

  const visibleGroups = useMemo(() => groups.filter((g) =>
    (!bandFilter || g.band === bandFilter)
    && (!rxTxFilter || g.txRxType === rxTxFilter)
    && (!search || g.channelGroupCode.includes(search)
        || (g.antennaName ?? '').includes(search)
        || channels.some((c) => c.channelGroupId === g.id
            && ((c.commonName ?? '').includes(search) || (c.channelShortName ?? '').includes(search))))),
  [groups, channels, bandFilter, rxTxFilter, search]);

  const chanCols = [
    { title: '通道代号', dataIndex: 'channelCode', width: 180, render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
    { title: '简称', dataIndex: 'channelShortName', width: 90 },
    {
      title: '常用名', dataIndex: 'commonName', width: 130,
      render: (v: string, r: Channel) => (
        <Space size={4}>
          <span>{v ?? '—'}</span>
          <Button type="text" size="small" icon={<EditOutlined />}
            onClick={() => { setEditing(r); setEditName(v ?? ''); }} />
        </Space>
      ),
    },
    { title: '带宽(MHz)', dataIndex: 'channelBandwidth', width: 100, align: 'right' as const },
    {
      title: '频率范围', width: 200,
      render: (_: unknown, r: Channel) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {fmtRange(r.channelStartFreq, r.channelEndFreq)}
        </span>
      ),
    },
  ];

  const openReceiver = async (g: ChannelGroup) => {
    setRcvGroup(g);
    rcvForm.setFieldsValue({ receiverActiveStatus: g.receiverActiveStatus ?? 'P0', operator: '', registrar: '' });
    try { setRcvLogs(await fetchReceiverLogs(g.channelGroupCode)); } catch { setRcvLogs([]); }
  };

  const doSwitchReceiver = async () => {
    if (!rcvGroup) return;
    const vals = await rcvForm.validateFields();
    try {
      await switchReceiver(rcvGroup.id, vals);
      message.success('接收机主备状态已切换并写入日志');
      setRcvGroup(null);
      bumpDataVersion();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card size="small" style={cardStyle}>
        <Space wrap>
          <Select allowClear placeholder="频段" style={{ width: 130 }} value={bandFilter}
            onChange={setBandFilter} options={bands.map((b) => ({ value: b, label: b }))} />
          <Select allowClear placeholder="收/发" style={{ width: 110 }} value={rxTxFilter}
            onChange={setRxTxFilter}
            options={[{ value: 'R', label: 'R 接收' }, { value: 'T', label: 'T 发射' }]} />
          <Input.Search allowClear placeholder="搜索通道组 / 波束 / 通道名" style={{ width: 260 }}
            onSearch={setSearch} onChange={(e) => !e.target.value && setSearch('')} />
          <span style={{ color: '#4a6a8a', fontSize: 12 }}>
            通道组 {visibleGroups.length} / {groups.length} · 通道 {channels.length}
          </span>
        </Space>
      </Card>

      <Spin spinning={loading}>
        {visibleGroups.length === 0
          ? <Empty style={{ marginTop: 60 }} description="无符合条件的通道组" />
          : (
            <Collapse
              style={{ background: 'transparent' }}
              items={visibleGroups.map((g) => {
                const gcs = channels
                  .filter((c) => c.channelGroupId === g.id)
                  .sort((a, b) => (a.channelStartFreq ?? 0) - (b.channelStartFreq ?? 0));
                return {
                  key: g.id,
                  style: { ...cardStyle, marginBottom: 8, borderRadius: 8 },
                  label: (
                    <Space size={10} wrap>
                      <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{g.channelGroupCode}</span>
                      <Tag color={g.txRxType === 'R' ? 'blue' : 'volcano'}>{g.txRxType === 'R' ? '接收' : '发射'}</Tag>
                      <Tag>{g.band}</Tag>
                      <Tag>{g.polarization} 极化</Tag>
                      <span style={{ color: '#7da3c8' }}>{g.antennaName}<span style={{ color: '#4a6a8a' }}>[{g.antennaCode}]</span></span>
                      <span style={{ color: '#4a6a8a', fontSize: 12 }}>{g.channelCount} 通道</span>
                      {g.primaryReceiverCode && <Tag color="green">接收机:{g.receiverActiveStatus ?? 'P0'}</Tag>}
                    </Space>
                  ),
                  extra: g.txRxType === 'R' ? (
                    <Button size="small" icon={<SwapOutlined />}
                      onClick={(e) => { e.stopPropagation(); openReceiver(g); }}>
                      接收机主备
                    </Button>
                  ) : undefined,
                  children: (
                    <>
                      <GroupStrip channels={gcs} />
                      <Table<Channel>
                        size="small" rowKey="id" columns={chanCols} dataSource={gcs}
                        pagination={gcs.length > 20 ? { pageSize: 20, size: 'small' } : false}
                      />
                    </>
                  ),
                };
              })}
            />
          )}
      </Spin>

      {/* 改常用名 */}
      <Modal
        open={!!editing}
        title={`修改常用名 — ${editing?.channelCode}`}
        onCancel={() => setEditing(null)}
        onOk={async () => {
          if (!editing || !editName.trim()) return;
          try {
            await updateChannelCommonName(editing.id, editName.trim());
            message.success('常用名已更新');
            setEditing(null);
            bumpDataVersion();
          } catch (e) { message.error((e as Error).message); }
        }}
      >
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="常用名" />
      </Modal>

      {/* 接收机主备切换 */}
      <Modal
        open={!!rcvGroup}
        title={`接收机主备切换 — ${rcvGroup?.channelGroupCode}`}
        onCancel={() => setRcvGroup(null)}
        onOk={doSwitchReceiver}
        okText="执行切换"
        width={560}
      >
        <Descriptions size="small" column={1} style={{ marginBottom: 12 }} labelStyle={{ color: '#4a6a8a', width: 110 }}>
          <Descriptions.Item label="主份接收机">{rcvGroup?.primaryReceiverCode ?? '未配置'}</Descriptions.Item>
          <Descriptions.Item label="一备接收机">{rcvGroup?.backupReceiverCode1 ?? '未配置'}</Descriptions.Item>
          <Descriptions.Item label="二备接收机">{rcvGroup?.backupReceiverCode2 ?? '未配置'}</Descriptions.Item>
          <Descriptions.Item label="当前主备状态">{rcvGroup?.receiverActiveStatus ?? '—'}</Descriptions.Item>
        </Descriptions>
        <Form form={rcvForm} layout="inline">
          <Form.Item name="receiverActiveStatus" label="切换至" rules={[{ required: true }]}>
            <Select style={{ width: 130 }} options={[
              { value: 'P0', label: 'P0 主份' },
              { value: 'P1', label: 'P1 一备' },
              { value: 'P2', label: 'P2 二备' },
            ]} />
          </Form.Item>
          <Form.Item name="operator" label="操作人"><Input style={{ width: 110 }} /></Form.Item>
          <Form.Item name="registrar" label="登记人"><Input style={{ width: 110 }} /></Form.Item>
        </Form>
        {rcvLogs.length > 0 && (
          <Table<ReceiverLog>
            size="small" rowKey="id" style={{ marginTop: 14 }}
            dataSource={rcvLogs} pagination={false}
            columns={[
              { title: '时间', dataIndex: 'switchTime', width: 150 },
              { title: '前', dataIndex: 'beforeStatus', width: 60 },
              { title: '后', dataIndex: 'afterStatus', width: 60 },
              { title: '操作人', dataIndex: 'operator' },
              { title: '登记人', dataIndex: 'registrar' },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
