/**
 * 通道交联 — 矩阵交叉点可视化
 * 常规矩阵画交叉网格(入通道 × 出通道,点 = 开关);DTP 大矩阵以表格呈现。
 * 开关可切换通断(常通不可切),放大器主备四件套可切换,均写切换日志。
 */
import { useEffect, useState } from 'react';
import {
  Card, Select, Space, Tag, Table, Empty, Spin, Drawer, Descriptions,
  Button, Modal, Form, Input, message, Tabs, Segmented, Switch as AntSwitch,
} from 'antd';
import { ThunderboltOutlined, SwapOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import {
  fetchMatrices, fetchMatrixSwitches, toggleSwitch, switchAmplifier,
  fetchSwitchLogs, fetchAmplifierLogs,
} from '@/api';
import type { Matrix, MatrixSwitch, SwitchLog } from '@/types';
import { fmtRange } from '@/utils/freq';

const cardStyle = { background: '#0c1a2e', border: '1px solid #1e3a5f' };

/** 常规矩阵交叉网格 */
function CrossGrid({ switches, onSelect }: {
  switches: MatrixSwitch[];
  onSelect: (s: MatrixSwitch) => void;
}) {
  const inSeqs = [...new Set(switches.map((s) => s.inputPortSeq).filter((v): v is number => v != null))].sort((a, b) => a - b);
  const outSeqs = [...new Set(switches.map((s) => s.outputPortSeq).filter((v): v is number => v != null))].sort((a, b) => a - b);
  const byKey = new Map(switches.map((s) => [`${s.inputPortSeq}|${s.outputPortSeq}`, s]));
  const inLabel = new Map<number, string>();
  const outLabel = new Map<number, string>();
  for (const s of switches) {
    if (s.inputPortSeq != null && s.inputChannelShortName) inLabel.set(s.inputPortSeq, s.inputChannelShortName);
    if (s.outputPortSeq != null && s.outputChannelShortName) outLabel.set(s.outputPortSeq, s.outputChannelShortName);
  }

  const CELL = 34, HDR = 74;
  const w = HDR + outSeqs.length * CELL + 8;
  const h = HDR + inSeqs.length * CELL + 8;

  return (
    <div style={{ overflow: 'auto', maxHeight: 560 }}>
      <svg width={w} height={h}>
        {/* 列头(出通道) */}
        {outSeqs.map((o, j) => (
          <text key={o} x={HDR + j * CELL + CELL / 2} y={HDR - 10}
            fill="#7da3c8" fontSize={9} textAnchor="start" fontFamily="monospace"
            transform={`rotate(-45 ${HDR + j * CELL + CELL / 2} ${HDR - 10})`}>
            {outLabel.get(o) ?? `O${o}`}
          </text>
        ))}
        {/* 行头(入通道) */}
        {inSeqs.map((i, r) => (
          <text key={i} x={HDR - 8} y={HDR + r * CELL + CELL / 2 + 3}
            fill="#7da3c8" fontSize={10} textAnchor="end" fontFamily="monospace">
            {inLabel.get(i) ?? `I${i}`}
          </text>
        ))}
        {/* 网格线 */}
        {inSeqs.map((_, r) => (
          <line key={`h${r}`} x1={HDR} y1={HDR + r * CELL + CELL / 2}
            x2={HDR + outSeqs.length * CELL} y2={HDR + r * CELL + CELL / 2}
            stroke="#16263d" strokeWidth={1} />
        ))}
        {outSeqs.map((_, j) => (
          <line key={`v${j}`} x1={HDR + j * CELL + CELL / 2} y1={HDR}
            x2={HDR + j * CELL + CELL / 2} y2={HDR + inSeqs.length * CELL}
            stroke="#16263d" strokeWidth={1} />
        ))}
        {/* 交叉点 */}
        {inSeqs.map((i, r) => outSeqs.map((o, j) => {
          const s = byKey.get(`${i}|${o}`);
          if (!s) return null;
          const cx = HDR + j * CELL + CELL / 2;
          const cy = HDR + r * CELL + CELL / 2;
          const on = s.switchStatus === 1;
          const switchable = s.switchType === '可切';
          return (
            <g key={s.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(s)}>
              <circle cx={cx} cy={cy} r={switchable ? 9 : 7}
                fill={on ? '#22c55e' : '#1e293b'}
                stroke={switchable ? '#fbbf24' : (on ? '#22c55e' : '#475569')}
                strokeWidth={switchable ? 2 : 1}
                opacity={on ? 1 : 0.7}>
                <title>{`${s.switchCode}\n${s.inputChannelShortName ?? ''} → ${s.outputChannelShortName ?? ''}\n${s.switchType} · ${on ? '通' : '断'}${s.primaryAmpCode ? `\n放大器:${s.primaryAmpCode}(${s.ampActiveStatus ?? '—'})` : ''}`}</title>
              </circle>
              {s.primaryAmpCode && (
                <circle cx={cx + 8} cy={cy - 8} r={3} fill="#f59e0b">
                  <title>配有放大器</title>
                </circle>
              )}
            </g>
          );
        }))}
      </svg>
    </div>
  );
}

export default function MatrixView() {
  const { selectedSatelliteId, dataVersion, bumpDataVersion } = useStore();
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [matrixId, setMatrixId] = useState<number | null>(null);
  const [switches, setSwitches] = useState<MatrixSwitch[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewChoice, setViewChoice] = useState<'grid' | 'table'>('grid');

  const [sel, setSel] = useState<MatrixSwitch | null>(null);
  const [swLogs, setSwLogs] = useState<SwitchLog[]>([]);
  const [ampLogs, setAmpLogs] = useState<SwitchLog[]>([]);
  const [ampModal, setAmpModal] = useState(false);
  const [ampForm] = Form.useForm();
  const [stForm] = Form.useForm();
  const [stModal, setStModal] = useState(false);

  useEffect(() => {
    if (!selectedSatelliteId) return;
    fetchMatrices(selectedSatelliteId).then((ms) => {
      setMatrices(ms);
      setMatrixId((cur) => (ms.some((m) => m.id === cur) ? cur : (ms[0]?.id ?? null)));
    }).catch(console.error);
  }, [selectedSatelliteId, dataVersion]);

  useEffect(() => {
    if (!matrixId) { setSwitches([]); return; }
    setLoading(true);
    fetchMatrixSwitches(matrixId)
      .then(setSwitches).catch(console.error).finally(() => setLoading(false));
  }, [matrixId, dataVersion]);

  const matrix = matrices.find((m) => m.id === matrixId);
  const isDtp = matrix?.matrixType === 2;
  // DTP 大矩阵交叉点过多,固定用表格视图
  const view = isDtp ? 'table' : viewChoice;

  const openDetail = async (s: MatrixSwitch) => {
    setSel(s);
    try {
      const [sl, al] = await Promise.all([fetchSwitchLogs(s.switchCode), fetchAmplifierLogs(s.switchCode)]);
      setSwLogs(sl); setAmpLogs(al);
    } catch { setSwLogs([]); setAmpLogs([]); }
  };

  const tableCols = [
    { title: '开关代码', dataIndex: 'switchCode', width: 200, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: '入通道', dataIndex: 'inputChannelShortName', width: 110 },
    { title: '出通道', dataIndex: 'outputChannelShortName', width: 110 },
    {
      title: '类型', dataIndex: 'switchType', width: 76,
      render: (v: string) => <Tag color={v === '可切' ? 'gold' : 'default'}>{v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'switchStatus', width: 64,
      render: (v: number) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '通' : '断'}</Tag>,
    },
    { title: '主份放大器', dataIndex: 'primaryAmpCode', width: 110, render: (v: string) => v ?? '—' },
    { title: '主备状态', dataIndex: 'ampActiveStatus', width: 86, render: (v: string) => v ?? '—' },
    {
      title: '', width: 70,
      render: (_: unknown, r: MatrixSwitch) => (
        <Button size="small" type="link" onClick={() => openDetail(r)}>详情</Button>
      ),
    },
  ];

  const logCols = [
    { title: '时间', dataIndex: 'switchTime', width: 150 },
    { title: '前', dataIndex: 'beforeStatus', width: 64 },
    { title: '后', dataIndex: 'afterStatus', width: 64 },
    { title: '操作人', dataIndex: 'operator', width: 90 },
    { title: '登记人', dataIndex: 'registrar', width: 90 },
  ];

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card size="small" style={cardStyle}>
        <Space wrap>
          <span style={{ color: '#4a6a8a', fontSize: 12 }}>切换矩阵</span>
          <Select
            style={{ width: 280 }} value={matrixId ?? undefined} onChange={setMatrixId}
            options={matrices.map((m) => ({
              value: m.id,
              label: `${m.matrixCode}（${m.inputPortCount}×${m.outputPortCount}${m.matrixType === 2 ? ' · DTP' : ''}）`,
            }))}
          />
          {matrix && (
            <>
              <Tag color={matrix.matrixType === 2 ? 'purple' : 'blue'}>
                {matrix.matrixType === 2 ? 'DTP 数字透明处理' : '常规开关矩阵'}
              </Tag>
              {matrix.remark && <Tag>{matrix.remark}</Tag>}
              <span style={{ color: '#4a6a8a', fontSize: 12 }}>交叉点 {switches.length}</span>
            </>
          )}
          <span style={{ flex: 1 }} />
          {!isDtp && (
            <Segmented value={view} onChange={(v) => setViewChoice(v as 'grid' | 'table')}
              options={[{ value: 'grid', label: '网格视图' }, { value: 'table', label: '表格视图' }]} />
          )}
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Card size="small" style={cardStyle}>
          {switches.length === 0
            ? <Empty description="该矩阵暂无开关数据" />
            : view === 'grid' && !isDtp
              ? (
                <>
                  <div style={{ color: '#4a6a8a', fontSize: 11, marginBottom: 8 }}>
                    ● 绿色=通 · 灰色=断 · 金色描边=可切(点击操作) · 橙点=配有放大器 · 行=入通道,列=出通道
                  </div>
                  <CrossGrid switches={switches} onSelect={openDetail} />
                </>
              )
              : (
                <Table<MatrixSwitch>
                  size="small" rowKey="id" columns={tableCols} dataSource={switches}
                  pagination={{ pageSize: 50, size: 'small', showTotal: (t) => `共 ${t} 个交叉点` }}
                />
              )}
        </Card>
      </Spin>

      {/* 开关详情抽屉 */}
      <Drawer
        open={!!sel}
        onClose={() => setSel(null)}
        width={520}
        title={<span style={{ fontFamily: 'monospace' }}>{sel?.switchCode}</span>}
      >
        {sel && (
          <>
            <Descriptions size="small" column={2} bordered labelStyle={{ color: '#4a6a8a', width: 96 }}>
              <Descriptions.Item label="入通道">{sel.inputChannelShortName ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="出通道">{sel.outputChannelShortName ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="接收频率" span={2}>
                <span style={{ fontFamily: 'monospace' }}>{fmtRange(sel.rxStartFreq, sel.rxEndFreq)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="发射频率" span={2}>
                <span style={{ fontFamily: 'monospace' }}>{fmtRange(sel.txStartFreq, sel.txEndFreq)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="波束/极化">
                {sel.rxAntennaName ?? '—'} · {sel.rxPolarization ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="频段">{sel.rxBand ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="开关类型">
                <Tag color={sel.switchType === '可切' ? 'gold' : 'default'}>{sel.switchType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="开关状态">
                <Space>
                  <Tag color={sel.switchStatus === 1 ? 'green' : 'default'}>{sel.switchStatus === 1 ? '通' : '断'}</Tag>
                  {sel.switchType === '可切' && (
                    <Button size="small" icon={<SwapOutlined />} onClick={() => {
                      stForm.setFieldsValue({ operator: '', registrar: '' });
                      setStModal(true);
                    }}>切换</Button>
                  )}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" style={{ ...cardStyle, marginTop: 14 }}
              title={<span><ThunderboltOutlined style={{ color: '#f59e0b' }} /> 放大器主备</span>}
              extra={sel.primaryAmpCode && (
                <Button size="small" onClick={() => {
                  ampForm.setFieldsValue({ ampActiveStatus: sel.ampActiveStatus ?? 'P0', operator: '', registrar: '' });
                  setAmpModal(true);
                }}>主备切换</Button>
              )}>
              {sel.primaryAmpCode ? (
                <Descriptions size="small" column={2} labelStyle={{ color: '#4a6a8a' }}>
                  <Descriptions.Item label="主份">{sel.primaryAmpCode}</Descriptions.Item>
                  <Descriptions.Item label="当前">{sel.ampActiveStatus ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="一备">{sel.backupAmpCode1 ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="二备">{sel.backupAmpCode2 ?? '—'}</Descriptions.Item>
                </Descriptions>
              ) : <span style={{ color: '#475569' }}>该开关未配置放大器</span>}
            </Card>

            <Tabs
              style={{ marginTop: 10 }}
              size="small"
              items={[
                {
                  key: 'sw', label: `开关切换日志(${swLogs.length})`,
                  children: <Table size="small" rowKey="id" columns={logCols} dataSource={swLogs} pagination={false} />,
                },
                {
                  key: 'amp', label: `放大器切换日志(${ampLogs.length})`,
                  children: <Table size="small" rowKey="id" columns={logCols} dataSource={ampLogs} pagination={false} />,
                },
              ]}
            />
          </>
        )}
      </Drawer>

      {/* 开关通断切换 */}
      <Modal
        open={stModal} title={`开关通断切换 — ${sel?.switchCode}`}
        onCancel={() => setStModal(false)}
        onOk={async () => {
          if (!sel) return;
          const vals = await stForm.validateFields();
          try {
            await toggleSwitch(sel.id, { switchStatus: sel.switchStatus === 1 ? 0 : 1, ...vals });
            message.success('开关已切换并写入日志');
            setStModal(false); setSel(null); bumpDataVersion();
          } catch (e) { message.error((e as Error).message); }
        }}
        okText={`切换为「${sel?.switchStatus === 1 ? '断' : '通'}」`}
      >
        <Form form={stForm} layout="inline" style={{ marginTop: 8 }}>
          <Form.Item label="当前状态">
            <AntSwitch checked={sel?.switchStatus === 1} disabled checkedChildren="通" unCheckedChildren="断" />
          </Form.Item>
          <Form.Item name="operator" label="操作人"><Input style={{ width: 110 }} /></Form.Item>
          <Form.Item name="registrar" label="登记人"><Input style={{ width: 110 }} /></Form.Item>
        </Form>
      </Modal>

      {/* 放大器主备切换 */}
      <Modal
        open={ampModal} title={`放大器主备切换 — ${sel?.switchCode}`}
        onCancel={() => setAmpModal(false)}
        onOk={async () => {
          if (!sel) return;
          const vals = await ampForm.validateFields();
          try {
            await switchAmplifier(sel.id, vals);
            message.success('放大器主备已切换并写入日志');
            setAmpModal(false); setSel(null); bumpDataVersion();
          } catch (e) { message.error((e as Error).message); }
        }}
        okText="执行切换"
      >
        <Form form={ampForm} layout="inline" style={{ marginTop: 8 }}>
          <Form.Item name="ampActiveStatus" label="切换至" rules={[{ required: true }]}>
            <Select style={{ width: 150 }} options={[
              { value: 'P0', label: `P0 主份(${sel?.primaryAmpCode ?? '—'})` },
              { value: 'P1', label: `P1 一备(${sel?.backupAmpCode1 ?? '—'})` },
              { value: 'P2', label: `P2 二备(${sel?.backupAmpCode2 ?? '—'})` },
            ]} />
          </Form.Item>
          <Form.Item name="operator" label="操作人"><Input style={{ width: 110 }} /></Form.Item>
          <Form.Item name="registrar" label="登记人"><Input style={{ width: 110 }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
