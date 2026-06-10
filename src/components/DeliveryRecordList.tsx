import { useEffect, useState } from 'react';
import {
  Table, Button, Popconfirm, Tag, Space, Tooltip, message, Modal, Form, Select, Input,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  fetchDeliveryRecordsByAllocationBlock, createDeliveryRecord, deleteDeliveryRecord,
} from '@/api';
import type { DeliveryRecord, OccupationRecord } from '@/types';

interface Props {
  allocationBlock: OccupationRecord;
  canManage?: boolean;
}

const DARK = {
  bg: '#0f172a', card: '#1e293b', border: '#334155', text: '#e2e8f0', muted: '#64748b',
};

function msToStr(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleString('zh-CN', { hour12: false });
}

export default function DeliveryRecordList({ allocationBlock, canManage = false }: Props) {
  const [records, setRecords]   = useState<DeliveryRecord[]>([]);
  const [loading, setLoading]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  function reload() {
    setLoading(true);
    fetchDeliveryRecordsByAllocationBlock(allocationBlock.id)
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { reload(); }, [allocationBlock.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: number) {
    await deleteDeliveryRecord(id);
    message.success('记录已删除');
    reload();
  }

  async function handleCreate() {
    let vals: Awaited<ReturnType<typeof form.validateFields>>;
    try { vals = await form.validateFields(); } catch { return; }
    await createDeliveryRecord({
      allocationBlockId:   allocationBlock.id,
      allocationBlockCode: allocationBlock.occupationCode ?? null,
      planningBlockId:     allocationBlock.planningBlockId ?? null,
      planningBlockCode:   allocationBlock.planningBlockCode ?? null,
      switchId:            allocationBlock.switchId,
      switchCode:          allocationBlock.switchCode ?? null,
      occupyStatus:        vals.occupyStatus as 'P' | 'R',
      contractNo:          vals.contractNo   ?? null,
      partyA:              vals.partyA       ?? null,
      operateUser:         vals.operateUser  ?? null,
      remark:              vals.remark       ?? null,
    });
    message.success('记录已创建');
    form.resetFields();
    setModalOpen(false);
    reload();
  }

  const columns: ColumnsType<DeliveryRecord> = [
    {
      title: '操作类型', dataIndex: 'occupyStatus', width: 100,
      render: (v) => v === 'P'
        ? <Tag color="success">P — 占用</Tag>
        : <Tag color="default">R — 释放</Tag>,
    },
    {
      title: '合同号', dataIndex: 'contractNo', width: 140, ellipsis: true,
      render: (v) => v ? <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</span> : '—',
    },
    { title: '甲方', dataIndex: 'partyA', width: 120, ellipsis: true, render: (v) => v ?? '—' },
    { title: '录入人员', dataIndex: 'operateUser', width: 100, render: (v) => v ?? '—' },
    {
      title: '操作时间', width: 150,
      render: (_, r) => (
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          {msToStr(r.operateTime ?? r.createdAt)}
        </span>
      ),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true, render: (v) => v ?? '—' },
    ...(canManage ? [{
      title: '操作', width: 60, fixed: 'right' as const,
      render: (_: unknown, r: DeliveryRecord) => (
        <Popconfirm
          title="确认删除该记录？"
          onConfirm={() => handleDelete(r.id)}
          okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
        >
          <Tooltip title="删除">
            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
          </Tooltip>
        </Popconfirm>
      ),
    } as ColumnsType<DeliveryRecord>[number]] : []),
  ];

  return (
    <div style={{ padding: '6px 0' }}>
      {canManage && (
        <div style={{ marginBottom: 8 }}>
          <Button
            size="small" type="primary" ghost icon={<PlusOutlined />}
            onClick={() => { form.resetFields(); setModalOpen(true); }}
          >
            新增操作记录
          </Button>
        </div>
      )}

      <Table<DeliveryRecord>
        size="small"
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        pagination={false}
        style={{ background: DARK.bg }}
        locale={{
          emptyText: (
            <span style={{ color: '#475569', fontSize: 12 }}>暂无带宽合约-交付过程记录</span>
          ),
        }}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        title={<span style={{ color: DARK.text }}>新增带宽合约-交付过程记录</span>}
        okText="提交" cancelText="取消"
        destroyOnHidden
        styles={{
          body:   { background: DARK.card },
          header: { background: DARK.card, borderBottom: `1px solid ${DARK.border}` },
          footer: { background: DARK.card, borderTop: `1px solid ${DARK.border}` },
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="occupyStatus"
            label={<span style={{ color: DARK.text }}>操作类型</span>}
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select
              options={[
                { value: 'P', label: 'P — 占用（频率资源已实际使用）' },
                { value: 'R', label: 'R — 释放（频率资源已归还）' },
              ]}
              placeholder="选择 P-占用 或 R-释放"
            />
          </Form.Item>
          <Form.Item name="contractNo" label={<span style={{ color: DARK.text }}>合同号</span>}>
            <Input placeholder="关联合同号（选填）" />
          </Form.Item>
          <Form.Item name="partyA" label={<span style={{ color: DARK.text }}>甲方/使用方</span>}>
            <Input placeholder="甲方或使用方名称（选填）" />
          </Form.Item>
          <Form.Item name="operateUser" label={<span style={{ color: DARK.text }}>录入人员</span>}>
            <Input placeholder="录入人员姓名（选填）" />
          </Form.Item>
          <Form.Item name="remark" label={<span style={{ color: DARK.text }}>备注</span>}>
            <Input.TextArea rows={2} placeholder="备注说明（选填）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
