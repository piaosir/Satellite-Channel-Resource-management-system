import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Layout, Menu, Tag, Button, Select } from 'antd';
import {
  AppstoreOutlined,
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
  LogoutOutlined,
} from '@ant-design/icons';
import MatrixLogoIcon from '@/components/MatrixLogoIcon';
import { useStore } from '@/store/useStore';
import { fetchSatellites } from '@/api';
import type { Satellite } from '@/types';
import type { Role } from '@/store/useStore';
import { PERMISSIONS } from '@/utils/roleGuard';

const { Sider, Header, Content } = Layout;

const roleLabels: Record<Role, { label: string; color: string }> = {
  business_manager: { label: '商务经理',       color: 'blue' },
  product_manager:  { label: '产品经理',       color: 'green' },
  product_rd:       { label: '产品研发',       color: 'cyan' },
  industry_manager: { label: '行业经理',       color: 'gold' },
  ops_engineer:     { label: '运控工程师',     color: 'lime' },
  network_engineer: { label: '网络系统工程师', color: 'purple' },
  digital_engineer: { label: '数字化工程师',   color: 'magenta' },
  inventory_manager:{ label: '库存管理员',     color: 'orange' },
  ttc_engineer:     { label: '卫星测控工程师', color: 'red' },
};

function buildMenu(role: Role | null) {
  const items: { key: string; icon: React.ReactNode; label: string }[] = [
    { key: '/dashboard', icon: <AppstoreOutlined />, label: '工作台' },
  ];
  if (role && PERMISSIONS.canAccessQuery(role))
    items.push({ key: '/query', icon: <SearchOutlined />, label: '资源查询' });
  if (role && PERMISSIONS.canAccessStats(role))
    items.push({ key: '/stats', icon: <BarChartOutlined />, label: '资源统计' });
  if (role && PERMISSIONS.canManageOccupation(role))
    items.push({ key: '/occupation', icon: <ToolOutlined />, label: '占用管理' });
  if (role && PERMISSIONS.canAccessContracts(role))
    items.push({ key: '/contracts', icon: <FileDoneOutlined />, label: '合约记录管理' });
  if (role && PERMISSIONS.canAccessUsage(role))
    items.push({ key: '/usage', icon: <HistoryOutlined />, label: '使用记录管理' });
  if (role && PERMISSIONS.canAccessPlanning(role))
    items.push({ key: '/planning', icon: <DeploymentUnitOutlined />, label: '载波规划管理' });
  if (role && PERMISSIONS.canAccessGround(role))
    items.push({ key: '/ground', icon: <CloudServerOutlined />, label: '地面系统管理' });
  if (role && PERMISSIONS.canAccessChannelConfig(role))
    items.push({ key: '/channel-config', icon: <SwitcherOutlined />, label: '通道配置管理' });
  if (role && PERMISSIONS.canAccessTWTA(role))
    items.push({ key: '/twta', icon: <ThunderboltOutlined />, label: '行波管状态管理' });
  items.push({ key: '/report', icon: <FileExcelOutlined />, label: '报表导出' });
  return items;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, selectedSatelliteId, setSatellite } = useStore();
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchSatellites().then((list) => {
      setSatellites(list);
      if (!selectedSatelliteId && list.length > 0) setSatellite(list[0].id);
    }).catch(console.error);
  }, [selectedSatelliteId, setSatellite]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const roleInfo = role ? roleLabels[role] : null;
  const menuItems = buildMenu(role);
  const timeStr = now.toLocaleString('zh-CN', { hour12: false });

  return (
    <Layout style={{ minHeight: '100vh', background: '#0f172a' }}>
      {/* ── 侧边栏 ── */}
      <Sider
        width={210}
        style={{
          background: '#0c1a2e',
          borderRight: '1px solid #1e3a5f',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 18px',
            borderBottom: '1px solid #1e3a5f',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <MatrixLogoIcon size={22} />
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, lineHeight: '18px' }}>
              通道资源管理系统
            </div>
            <div style={{ color: '#2563eb', fontSize: 9, lineHeight: '13px', letterSpacing: 1.5, fontFamily: 'monospace' }}>
              RF MATRIX MANAGEMENT
            </div>
          </div>
        </div>

        {/* 分组标签 */}
        <div style={{ padding: '14px 18px 6px', color: '#2d4a6e', fontSize: 10, letterSpacing: 1.5, fontWeight: 600 }}>
          功能导航
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{
            background: 'transparent',
            border: 'none',
            flex: 1,
            overflowY: 'auto',
          }}
          theme="dark"
        />

        {/* 底部版本信息 */}
        <div
          style={{
            borderTop: '1px solid #1e3a5f',
            padding: '10px 18px',
            color: '#2d4a6e',
            fontSize: 10,
            lineHeight: '16px',
          }}
        >
          <div>RFMATRIX DEMO v0.1</div>
          <div style={{ marginTop: 2 }}>仅供演示，禁止用于生产</div>
        </div>
      </Sider>

      {/* ── 右侧内容区 ── */}
      <Layout style={{ marginLeft: 210 }}>
        {/* 顶部栏 */}
        <Header
          style={{
            background: '#0c1a2e',
            borderBottom: '1px solid #1e3a5f',
            height: 50,
            lineHeight: '50px',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {/* 卫星选择 */}
          <span style={{ color: '#4a6a8a', fontSize: 12, whiteSpace: 'nowrap' }}>当前卫星</span>
          <Select
            value={selectedSatelliteId ?? undefined}
            onChange={setSatellite}
            style={{ width: 230 }}
            size="small"
            placeholder="选择卫星"
            options={satellites.map((s) => {
              const off = !!s.statusText && s.statusText !== '在轨运营';
              return {
                value: s.id,
                label: (
                  <span style={{ opacity: off ? 0.5 : 1 }}>
                    {s.satelliteName}（{s.satelliteCode}）
                    {off ? ` · ${s.statusText}` : ''}
                  </span>
                ),
              };
            })}
          />

          <div style={{ flex: 1 }} />

          {/* 系统状态指示灯 */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              color: '#22c55e',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 6px #22c55e88',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            系统正常
          </span>

          {/* 当前时间 */}
          <span
            style={{
              color: '#4a6a8a',
              fontSize: 12,
              fontFamily: 'monospace',
              minWidth: 152,
              textAlign: 'right',
              letterSpacing: 0.5,
            }}
          >
            {timeStr}
          </span>

          {/* 角色标签 */}
          {roleInfo && (
            <Tag color={roleInfo.color} style={{ margin: 0, fontSize: 11 }}>
              {roleInfo.label}
            </Tag>
          )}

          {/* 切换角色按钮 */}
          <Button
            size="small"
            icon={<LogoutOutlined />}
            style={{ background: 'transparent', borderColor: '#2d4a6e', color: '#64748b', fontSize: 12 }}
            onClick={() => navigate('/')}
          >
            切换角色
          </Button>
        </Header>

        {/* 页面内容 */}
        <Content style={{ background: '#0f172a', minHeight: 'calc(100vh - 50px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
