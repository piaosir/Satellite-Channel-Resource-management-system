import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Tag, Button } from 'antd';
import MatrixLogoIcon from '@/components/MatrixLogoIcon';
import { useStore } from '@/store/useStore';
import { fetchSatellites } from '@/api';
import type { Satellite } from '@/types';
import type { Role } from '@/store/useStore';
import { useState } from 'react';

const roleLabels: Record<Role, { label: string; color: string }> = {
  business_manager:  { label: '商务经理',       color: 'blue' },
  product_manager:   { label: '产品经理',       color: 'green' },
  product_rd:        { label: '产品研发',       color: 'cyan' },
  industry_manager:  { label: '行业经理',       color: 'gold' },
  ops_engineer:      { label: '运控工程师',     color: 'lime' },
  network_engineer:  { label: '网络系统工程师', color: 'purple' },
  digital_engineer:  { label: '数字化工程师',   color: 'magenta' },
  inventory_manager: { label: '库存管理员',     color: 'orange' },
  ttc_engineer:      { label: '卫星测控工程师', color: 'red' },
};

export default function TopBar() {
  const navigate = useNavigate();
  const { role, selectedSatelliteId, setSatellite } = useStore();
  const [satellites, setSatellites] = useState<Satellite[]>([]);

  useEffect(() => {
    fetchSatellites().then((list) => {
      setSatellites(list);
      if (!selectedSatelliteId && list.length > 0) {
        setSatellite(list[0].id);
      }
    }).catch(console.error);
  }, [selectedSatelliteId, setSatellite]);

  const roleInfo = role ? roleLabels[role] : null;

  return (
    <div
      style={{
        height: 56,
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
        <MatrixLogoIcon size={20} />
        <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap' }}>
          通道资源管理系统
        </span>
      </div>

      {/* 卫星选择 */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <Select
          value={selectedSatelliteId ?? undefined}
          onChange={setSatellite}
          style={{ width: 200 }}
          placeholder="选择卫星"
          options={satellites.map((s) => ({
            value: s.id,
            label: `${s.satelliteName}（${s.satelliteCode}）`,
          }))}
        />
      </div>

      {/* 角色 + 切换 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 180, justifyContent: 'flex-end' }}>
        {roleInfo && <Tag color={roleInfo.color}>{roleInfo.label}</Tag>}
        <Button size="small" onClick={() => navigate('/')}>
          切换角色
        </Button>
      </div>
    </div>
  );
}

