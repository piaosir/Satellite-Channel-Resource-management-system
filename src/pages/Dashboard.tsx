import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag } from 'antd';
import {
  SearchOutlined,
  BarChartOutlined,
  ToolOutlined,
  FileDoneOutlined,
  HistoryOutlined,
  DeploymentUnitOutlined,
  CloudServerOutlined,
  SwitcherOutlined,
  ThunderboltOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { fetchSatellites, fetchSatelliteDetail } from '@/api';
import { PERMISSIONS } from '@/utils/roleGuard';
import type { Role } from '@/store/useStore';
import type { Satellite } from '@/types';

// 卫星状态 → 标签颜色
const SAT_STATUS_COLOR: Record<string, string> = {
  在轨运营: 'green',
  在建: 'blue',
  停止服务: 'default',
  离轨: 'red',
};

interface FuncCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
  path: string;
  color: string;
}

const ALL_CARDS: Array<FuncCard & { check: (r: Role) => boolean }> = [
  {
    icon: <SearchOutlined />,
    title: '资源查询',
    desc: '查看卫星通道频率占用状态，支持频段/极化等多维筛选',
    path: '/query',
    color: '#3b82f6',
    check: (r) => PERMISSIONS.canAccessQuery(r),
  },
  {
    icon: <BarChartOutlined />,
    title: '资源统计',
    desc: '频率资源使用率可视化，按频段/使用类型分析占用分布',
    path: '/stats',
    color: '#22c55e',
    check: (r) => PERMISSIONS.canAccessStats(r),
  },
  {
    icon: <ToolOutlined />,
    title: '占用管理',
    desc: '新建、编辑、删除频率占用记录，支持实时冲突检测',
    path: '/occupation',
    color: '#f59e0b',
    check: (r) => PERMISSIONS.canManageOccupation(r),
  },
  {
    icon: <FileDoneOutlined />,
    title: '合约记录管理',
    desc: '管理频率租用合约，跟踪合约状态与客户信息',
    path: '/contracts',
    color: '#06b6d4',
    check: (r) => PERMISSIONS.canAccessContracts(r),
  },
  {
    icon: <HistoryOutlined />,
    title: '使用记录管理',
    desc: '查看频率资源使用历史，跟踪运行状态与时间记录',
    path: '/usage',
    color: '#8b5cf6',
    check: (r) => PERMISSIONS.canAccessUsage(r),
  },
  {
    icon: <DeploymentUnitOutlined />,
    title: '载波规划管理',
    desc: '制定与跟踪频率资源及载波分配规划方案',
    path: '/planning',
    color: '#ec4899',
    check: (r) => PERMISSIONS.canAccessPlanning(r),
  },
  {
    icon: <CloudServerOutlined />,
    title: '地面系统管理',
    desc: '监控关口站、信关站等地面系统在线状态与连接情况',
    path: '/ground',
    color: '#10b981',
    check: (r) => PERMISSIONS.canAccessGround(r),
  },
  {
    icon: <SwitcherOutlined />,
    title: '通道配置管理',
    desc: '查看并控制卫星通道开关状态，进行在线配置操作',
    path: '/channel-config',
    color: '#84cc16',
    check: (r) => PERMISSIONS.canAccessChannelConfig(r),
  },
  {
    icon: <ThunderboltOutlined />,
    title: '行波管状态管理',
    desc: '控制 TWTA 静噪、档位调整、FGM/ALC 模式与备份切换',
    path: '/twta',
    color: '#ef4444',
    check: (r) => PERMISSIONS.canAccessTWTA(r),
  },
  {
    icon: <FileExcelOutlined />,
    title: '报表导出',
    desc: '自定义字段，导出 Excel 格式的射频矩阵占用报表',
    path: '/report',
    color: '#f97316',
    check: (_r) => true,
  },
];

function ProfileField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ minWidth: 110 }}>
      <div style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 500, whiteSpace: 'pre-line' }}>
        {value || '—'}
      </div>
    </div>
  );
}

function SatelliteProfile({ sat }: { sat: Satellite }) {
  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 36,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <span style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>{sat.satelliteName}</span>
        <span style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: 13 }}>{sat.satelliteCode}</span>
        {sat.statusText && <Tag color={SAT_STATUS_COLOR[sat.statusText] ?? 'default'}>{sat.statusText}</Tag>}
        {sat.ownership && (
          <Tag color={sat.ownership === '自有' ? 'geekblue' : 'purple'}>{sat.ownership}</Tag>
        )}
      </div>
      <div style={{ display: 'flex', gap: 32, rowGap: 16, flexWrap: 'wrap', marginBottom: sat.coverage ? 16 : 0 }}>
        <ProfileField label="轨道位置" value={sat.orbitPosition} />
        <ProfileField label="卫星平台" value={sat.platform} />
        <ProfileField label="转发器数量" value={sat.transponderCount} />
        <ProfileField label="发射时间" value={sat.launchDate} />
        <ProfileField label="设计寿命" value={sat.designLife} />
        <ProfileField label="极化方式" value={sat.polarization} />
        <ProfileField label="制造商" value={sat.manufacturer} />
        <ProfileField label="位保精度" value={sat.stationKeepingAccuracy} />
      </div>
      {sat.coverage && (
        <div style={{ borderTop: '1px solid #283548', paddingTop: 14 }}>
          <div style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>覆盖范围</div>
          <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {sat.coverage}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, selectedSatelliteId, setSatellite } = useStore();
  const [sat, setSat] = useState<Satellite | null>(null);

  useEffect(() => {
    if (selectedSatelliteId) return;
    fetchSatellites().then((list) => {
      if (list.length > 0) setSatellite(list[0].id);
    }).catch(console.error);
  }, [selectedSatelliteId, setSatellite]);

  useEffect(() => {
    if (!selectedSatelliteId) { setSat(null); return; }
    fetchSatelliteDetail(selectedSatelliteId).then(setSat).catch(console.error);
  }, [selectedSatelliteId]);

  const cards = role
    ? ALL_CARDS.filter((c) => c.check(role))
    : [];

  return (
    <div style={{ padding: '48px 48px 32px' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        功能选择
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 28px' }}>
        工作台
      </h1>

      {sat && <SatelliteProfile sat={sat} />}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {cards.map((c) => (
          <div
            key={c.path}
            onClick={() => navigate(c.path)}
            style={{
              width: 260,
              padding: 28,
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = c.color;
              el.style.transform = 'translateY(-4px)';
              el.style.boxShadow = `0 12px 32px ${c.color}33`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = '#334155';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: `${c.color}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: c.color,
                marginBottom: 16,
              }}
            >
              {c.icon}
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
              {c.title}
            </div>
            <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
