import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Tag, Button } from 'antd';
import MatrixLogoIcon from '@/components/MatrixLogoIcon';
import { useStore } from '@/store/useStore';
import { querySatellites } from '@/db/queries';
import type { Satellite } from '@/types';
import type { Role } from '@/store/useStore';
import { useState } from 'react';

const roleLabels: Record<Role, { label: string; color: string }> = {
  business:           { label: '商务经理',     color: 'blue' },
  product:            { label: '产品经理',     color: 'green' },
  project_manager:    { label: '项目经理',     color: 'cyan' },
  delivery:           { label: '交付经理',     color: 'orange' },
  satellite_engineer: { label: '卫星通信工程师', color: 'purple' },
};

export default function TopBar() {
  const navigate = useNavigate();
  const { db, role, selectedSatelliteId, setSatellite } = useStore();
  const [satellites, setSatellites] = useState<Satellite[]>([]);

  useEffect(() => {
    if (!db) return;
    const list = querySatellites(db);
    setSatellites(list);
    if (!selectedSatelliteId && list.length > 0) {
      setSatellite(list[0].id);
    }
  }, [db, selectedSatelliteId, setSatellite]);

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
          射频矩阵管理系统
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

