/**
 * 合约与交付 — 客户 → 用户 → 合约 → 交付过程记录
 * 合约详情含交付流水(占用/释放),登记新交付时必须选择已存在的分配块。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Tabs, Input, Space, Tag, Drawer, Descriptions, Button,
  Modal, Form, Select, Radio, message, Alert, Statistic, Row, Col,
} from 'antd';
import { useStore } from '@/store/useStore';
import {
  fetchContracts, fetchContractDetail, fetchCustomers, fetchCustomerDetail,
  fetchSatellites, fetchAllocationBlocks, fetchChannels, createDeliveryRecord,
} from '@/api';
import type { Contract, Customer, DeliveryRecord, Satellite, AllocationBlock } from '@/types';
import { allocStatusText, fmtRange, beamNameMap, beamLabel } from '@/utils/freq';

const cardStyle = { background: '#0c1a2e', border: '1px solid #1e3a5f' };
const fmtMoney = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('zh-CN', { maximumFractionDigits: 2 });

export default function Contracts() {
  const { dataVersion, bumpDataVersion } = useStore();

  // 合约
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [satFilter, setSatFilter] = useState<string | undefined>();
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [sel, setSel] = useState<Contract | null>(null);

  // 客户
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [custTotal, setCustTotal] = useState(0);
  const [custPage, setCustPage] = useState(1);
  const [custSearch, setCustSearch] = useState('');
  const [custSel, setCustSel] = useState<Customer | null>(null);

  // 登记交付
  const [dlvOpen, setDlvOpen] = useState(false);
  const [dlvForm] = Form.useForm();
  const [dlvSatId, setDlvSatId] = useState<number | null>(null);
  const [dlvBlocks, setDlvBlocks] = useState<AllocationBlock[]>([]);
  const [dlvBeamNames, setDlvBeamNames] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchContracts({ satellite: satFilter }), fetchSatellites()])
      .then(([cs, ss]) => { setContracts(cs); setSatellites(ss); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [satFilter, dataVersion]);

  useEffect(() => {
    fetchCustomers({ search: custSearch || undefined, offset: (custPage - 1) * 50, limit: 50 })
      .then((r) => { setCustomers(r.items); setCustTotal(r.total); })
      .catch(console.error);
  }, [custSearch, custPage, dataVersion]);

  const visibleContracts = useMemo(() => contracts.filter((c) =>
    !search
    || (c.customerName ?? '').includes(search)
    || (c.productName ?? '').includes(search)
    || (c.mainOrderCode ?? '').includes(search)
    || String(c.id) === search),
  [contracts, search]);

  const totalAmount = useMemo(
    () => visibleContracts.reduce((s, c) => s + (c.amount ?? 0), 0), [visibleContracts]);
  const totalBw = useMemo(
    () => visibleContracts.reduce((s, c) => s + (c.bandwidthMHz ?? 0), 0), [visibleContracts]);

  const openContract = async (c: Contract) => {
    try { setSel(await fetchContractDetail(c.id)); } catch (e) { message.error((e as Error).message); }
  };

  const openDelivery = () => {
    dlvForm.resetFields();
    dlvForm.setFieldsValue({ action: '占用', exclusiveType: '独占' });
    setDlvSatId(null);
    setDlvBlocks([]);
    setDlvOpen(true);
  };

  const loadDlvBlocks = async (satId: number) => {
    setDlvSatId(satId);
    dlvForm.setFieldValue('blockCode', undefined);
    try {
      const [blocks, channels] = await Promise.all([
        fetchAllocationBlocks(satId, true), fetchChannels(satId),
      ]);
      setDlvBlocks(blocks);
      setDlvBeamNames(beamNameMap(channels));
    } catch { setDlvBlocks([]); setDlvBeamNames({}); }
  };

  const doDelivery = async () => {
    if (!sel) return;
    const vals = await dlvForm.validateFields();
    try {
      await createDeliveryRecord({
        contractId: sel.id,
        blockCode: vals.blockCode,
        action: vals.action,
        exclusiveType: vals.exclusiveType,
        handler: vals.handler,
        registrar: vals.registrar,
      });
      message.success(`已登记「${vals.action}」`);
      setDlvOpen(false);
      bumpDataVersion();
      setSel(await fetchContractDetail(sel.id));
    } catch (e) { message.error((e as Error).message); }
  };

  const contractCols = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '客户', dataIndex: 'customerName', ellipsis: true,
      render: (v: string, r: Contract) => <span>{v}<span style={{ color: '#475569', marginLeft: 6, fontSize: 11 }}>{r.customerCode}</span></span> },
    { title: '商品', dataIndex: 'productName', width: 180, ellipsis: true },
    { title: '类型', dataIndex: 'productType', width: 70 },
    { title: '带宽(MHz)', dataIndex: 'bandwidthMHz', width: 96, align: 'right' as const },
    { title: '金额(元)', dataIndex: 'amount', width: 110, align: 'right' as const, render: fmtMoney },
    { title: '开通', dataIndex: 'startTime', width: 100, render: (v: string) => v?.slice(0, 10) ?? '—' },
    { title: '到期', dataIndex: 'endTime', width: 100, render: (v: string) => v?.slice(0, 10) ?? '—' },
    { title: '交付', dataIndex: 'deliveryRecordCount', width: 60, align: 'right' as const },
    {
      title: '在占块', dataIndex: 'occupiedBandwidth', width: 90, align: 'right' as const,
      render: (v: number) => v > 0 ? <Tag color="orange">{v} MHz</Tag> : <span style={{ color: '#475569' }}>0</span>,
    },
  ];

  const recordCols = [
    { title: '时间', dataIndex: 'actionTime', width: 150 },
    {
      title: '动作', dataIndex: 'action', width: 64,
      render: (v: string) => <Tag color={v === '占用' ? 'orange' : 'cyan'}>{v}</Tag>,
    },
    { title: '卫星', dataIndex: 'satelliteCode', width: 80 },
    { title: '带宽', dataIndex: 'bandwidth', width: 70, render: (v: number) => `${v} M` },
    {
      title: '频率块代码', dataIndex: 'blockCode', ellipsis: true,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</span>,
    },
    { title: '独占', dataIndex: 'exclusiveType', width: 64 },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Tabs
        items={[
          {
            key: 'contracts',
            label: `带宽合约(${contracts.length})`,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={16}>
                  <Col span={5}><Card size="small" style={cardStyle}>
                    <Statistic title="合约数" value={visibleContracts.length} valueStyle={{ fontSize: 20 }} /></Card></Col>
                  <Col span={5}><Card size="small" style={cardStyle}>
                    <Statistic title="签约带宽合计" value={totalBw.toFixed(1)} suffix="MHz" valueStyle={{ fontSize: 20, color: '#3b82f6' }} /></Card></Col>
                  <Col span={6}><Card size="small" style={cardStyle}>
                    <Statistic title="签约金额合计" value={fmtMoney(totalAmount)} suffix="元" valueStyle={{ fontSize: 20, color: '#f59e0b' }} /></Card></Col>
                </Row>
                <Card size="small" style={cardStyle}>
                  <Space wrap>
                    <Input.Search allowClear placeholder="搜索客户 / 商品 / 主订单 / 合约ID" style={{ width: 280 }}
                      onSearch={setSearch} onChange={(e) => !e.target.value && setSearch('')} />
                    <Select allowClear placeholder="按交付卫星筛选" style={{ width: 180 }}
                      value={satFilter} onChange={setSatFilter}
                      options={satellites.map((s) => ({ value: s.satelliteCode, label: `${s.satelliteName}(${s.satelliteCode})` }))} />
                  </Space>
                </Card>
                <Card size="small" style={cardStyle}>
                  <Table<Contract>
                    size="small" rowKey="id" loading={loading}
                    columns={contractCols} dataSource={visibleContracts}
                    pagination={{ pageSize: 20, size: 'small', showTotal: (t) => `共 ${t} 份合约` }}
                    onRow={(r) => ({ onClick: () => openContract(r), style: { cursor: 'pointer' } })}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'customers',
            label: `客户(${custTotal})`,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Card size="small" style={cardStyle}>
                  <Input.Search allowClear placeholder="搜索客户全称 / 客户ID / 信用代码" style={{ width: 320 }}
                    onSearch={(v) => { setCustSearch(v); setCustPage(1); }}
                    onChange={(e) => { if (!e.target.value) { setCustSearch(''); setCustPage(1); } }} />
                </Card>
                <Card size="small" style={cardStyle}>
                  <Table<Customer>
                    size="small" rowKey="customerCode"
                    dataSource={customers}
                    pagination={{
                      current: custPage, pageSize: 50, total: custTotal, size: 'small',
                      onChange: setCustPage, showSizeChanger: false,
                      showTotal: (t) => `共 ${t} 个客户`,
                    }}
                    onRow={(r) => ({
                      onClick: async () => {
                        try { setCustSel(await fetchCustomerDetail(r.customerCode)); }
                        catch (e) { message.error((e as Error).message); }
                      },
                      style: { cursor: 'pointer' },
                    })}
                    columns={[
                      { title: '客户ID', dataIndex: 'customerCode', width: 120, render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
                      { title: '客户全称', dataIndex: 'customerName', ellipsis: true },
                      { title: '统一社会信用代码', dataIndex: 'creditCode', width: 200, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v ?? '—'}</span> },
                      { title: '建档时间', dataIndex: 'createdTime', width: 160 },
                    ]}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* 合约详情 */}
      <Drawer open={!!sel} onClose={() => setSel(null)} width={680}
        title={`合约 #${sel?.id} — ${sel?.customerName ?? ''}`}
        extra={<Button type="primary" size="small" onClick={openDelivery}>登记交付</Button>}>
        {sel && (
          <>
            <Descriptions size="small" column={2} bordered labelStyle={{ color: '#4a6a8a', width: 96 }}>
              <Descriptions.Item label="客户">{sel.customerName}
                <span style={{ color: '#475569', marginLeft: 6, fontSize: 11 }}>{sel.customerCode}</span>
              </Descriptions.Item>
              <Descriptions.Item label="用户号">{sel.userId}</Descriptions.Item>
              <Descriptions.Item label="主订单" span={2}>
                <span style={{ fontFamily: 'monospace' }}>{sel.mainOrderCode ?? '—'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="商品">{sel.productName}</Descriptions.Item>
              <Descriptions.Item label="类型">{sel.productType}</Descriptions.Item>
              <Descriptions.Item label="签约带宽">{sel.bandwidthMHz} MHz</Descriptions.Item>
              <Descriptions.Item label="期数">{sel.periods}</Descriptions.Item>
              <Descriptions.Item label="签约金额">{fmtMoney(sel.amount)} 元</Descriptions.Item>
              <Descriptions.Item label="期限">
                {sel.startTime?.slice(0, 10)} ~ {sel.endTime?.slice(0, 10)}
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" style={{ ...cardStyle, marginTop: 14 }}
              title={`交付过程记录(${sel.deliveryRecords?.length ?? 0})`}>
              <Table<DeliveryRecord>
                size="small" rowKey="id"
                columns={recordCols}
                dataSource={sel.deliveryRecords ?? []}
                pagination={false}
                locale={{ emptyText: '尚无交付记录' }}
              />
            </Card>
          </>
        )}
      </Drawer>

      {/* 客户详情 */}
      <Drawer open={!!custSel} onClose={() => setCustSel(null)} width={520}
        title={custSel?.customerName}>
        {custSel && (
          <>
            <Descriptions size="small" column={1} bordered labelStyle={{ color: '#4a6a8a', width: 130 }}>
              <Descriptions.Item label="客户ID">
                <span style={{ fontFamily: 'monospace' }}>{custSel.customerCode}</span>
              </Descriptions.Item>
              <Descriptions.Item label="统一社会信用代码">
                <span style={{ fontFamily: 'monospace' }}>{custSel.creditCode ?? '—'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="建档时间">{custSel.createdTime ?? '—'}</Descriptions.Item>
            </Descriptions>
            <Card size="small" style={{ ...cardStyle, marginTop: 14 }}
              title={`名下用户(${custSel.users?.length ?? 0})`}>
              <Table
                size="small" rowKey="id"
                dataSource={custSel.users ?? []}
                pagination={false}
                columns={[
                  { title: '用户ID', dataIndex: 'id', width: 90 },
                  { title: '说明', render: () => <span style={{ color: '#475569' }}>用户与合约一一对应,用户ID即合约的用户号</span> },
                ]}
                locale={{ emptyText: '名下暂无用户' }}
              />
            </Card>
          </>
        )}
      </Drawer>

      {/* 登记交付 */}
      <Modal
        open={dlvOpen}
        title={`登记交付 — 合约 #${sel?.id}`}
        onCancel={() => setDlvOpen(false)}
        onOk={doDelivery}
        okText="登记"
        width={680}
      >
        <Alert type="info" showIcon style={{ marginBottom: 14 }}
          message="交付记录必须引用通道分配状态中已存在的频率块代码;请先在「频率分配」页完成分配,再到此登记占用/释放。" />
        <Form form={dlvForm} layout="vertical">
          <Space size="middle" style={{ width: '100%' }} direction="vertical">
            <Space size="middle" wrap>
              <Form.Item label="卫星" required style={{ marginBottom: 0 }}>
                <Select style={{ width: 200 }} placeholder="选择卫星"
                  value={dlvSatId ?? undefined} onChange={loadDlvBlocks}
                  options={satellites.map((s) => ({ value: s.id, label: `${s.satelliteName}(${s.satelliteCode})` }))} />
              </Form.Item>
              <Form.Item name="action" label="动作" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                <Radio.Group options={[{ value: '占用', label: '占用' }, { value: '释放', label: '释放' }]} />
              </Form.Item>
              <Form.Item name="exclusiveType" label="独占/共享" style={{ marginBottom: 0 }}>
                <Select style={{ width: 100 }} options={[
                  { value: '独占', label: '独占' }, { value: '共享', label: '共享' },
                ]} />
              </Form.Item>
            </Space>
            <Form.Item name="blockCode" label="分配块(频率块代码)"
              rules={[{ required: true, message: '请选择分配块' }]} style={{ marginBottom: 0 }}>
              <Select
                showSearch optionFilterProp="label"
                placeholder={dlvSatId ? '搜索分配块' : '请先选择卫星'}
                disabled={!dlvSatId}
                options={dlvBlocks.map((b) => ({
                  value: b.blockCode,
                  label: `#${b.id} ${beamLabel(dlvBeamNames, b.uplinkBeam)} ${b.uplinkPolarization}极化 ${fmtRange(b.uplinkStartFreq, b.uplinkEndFreq)} · ${b.bandwidth}M · ${allocStatusText(b)}`,
                }))}
              />
            </Form.Item>
            <Space size="middle">
              <Form.Item name="handler" label="受理人员" style={{ marginBottom: 0 }}><Input style={{ width: 130 }} /></Form.Item>
              <Form.Item name="registrar" label="登记人员" style={{ marginBottom: 0 }}><Input style={{ width: 130 }} /></Form.Item>
            </Space>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
