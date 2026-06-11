/**
 * 占用时间线 — 分配块的占用/释放过程可视化
 * 合并合约交付记录与自有载波使用记录,按时间倒序成时间线。
 */
import { Timeline, Tag, Empty } from 'antd';
import type { DeliveryRecord, CarrierUsageRecord } from '@/types';

interface Props {
  deliveries: DeliveryRecord[];
  usages: CarrierUsageRecord[];
}

interface Item {
  key: string;
  time: string;
  action: '占用' | '释放';
  source: 'contract' | 'carrier';
  who: string;
  handler?: string | null;
}

export default function OccupancyTimeline({ deliveries, usages }: Props) {
  const items: Item[] = [
    ...deliveries.filter((d) => d.action).map((d) => ({
      key: `d${d.id}`,
      time: d.actionTime ?? '',
      action: d.action as '占用' | '释放',
      source: 'contract' as const,
      who: d.customerName ? `${d.customerName}(合约#${d.contractId})` : `合约 #${d.contractId}`,
      handler: d.handler,
    })),
    ...usages.filter((u) => u.action).map((u) => ({
      key: `u${u.id}`,
      time: u.actionTime ?? '',
      action: u.action as '占用' | '释放',
      source: 'carrier' as const,
      who: u.carrierId ? `自有载波 #${u.carrierId}` : '自有业务',
      handler: u.handler,
    })),
  ].sort((a, b) => (b.time || '').localeCompare(a.time || '') || b.key.localeCompare(a.key));

  if (items.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该分配块尚无占用/释放过程记录" />;
  }

  return (
    <Timeline
      style={{ marginTop: 6 }}
      items={items.map((it) => ({
        key: it.key,
        color: it.action === '占用' ? (it.source === 'contract' ? '#f59e0b' : '#06b6d4') : 'gray',
        content: (
          <div style={{ fontSize: 12 }}>
            <span style={{ color: '#4a6a8a', fontFamily: 'monospace', marginRight: 8 }}>{it.time || '—'}</span>
            <Tag color={it.action === '占用' ? (it.source === 'contract' ? 'orange' : 'cyan') : 'default'}>
              {it.source === 'contract' ? '合约' : '自用'}{it.action}
            </Tag>
            <span style={{ color: '#cbd5e1' }}>{it.who}</span>
            {it.handler && <span style={{ color: '#475569', marginLeft: 8 }}>受理:{it.handler}</span>}
          </div>
        ),
      }))}
    />
  );
}
