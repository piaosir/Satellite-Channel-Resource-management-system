import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Layout, Menu, Tag, Button, Select } from 'antd';
import {
  RadarChartOutlined,
  AppstoreOutlined,
  SearchOutlined,
  ToolOutlined,
  FileExcelOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { querySatellites } from '@/db/queries';
import type { Satellite } from '@/types';
import type { Role } from '@/store/useStore';

const { Sider, Header, Content } = Layout;

const roleLabels: Record<Role, { label: string; color: string }> = {
  business: { label: '商务经理', color: 'blue' },
  product:  { label: '产品经理', color: 'green' },
  delivery: { label: '交付经理', color: 'orange' },
};

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { db, role, selectedSatelliteId, setSatellite } = useStore();
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!db) return;
    const list = querySatellites(db);
    setSatellites(list);
    if (!selectedSatelliteId && list.length > 0) setSatellite(list[0].id);
  }, [db, selectedSatelliteId, setSatellite]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const roleInfo = role ? roleLabels[role] : null;

  const menuItems = [
    { key: '/dashboard', icon: <AppstoreOutlined />, label: '工作台' },
    { key: '/query',     icon: <SearchOutlined />,   label: '资源查询' },
    ...(role === 'delivery'
      ? [{ key: '/occupation', icon: <ToolOutlined />, label: '占用管理' }]
      : []),
    { key: '/report', icon: <FileExcelOutlined />, label: '报表导出' },
  ];

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
          <RadarChartOutlined style={{ color: '#3b82f6', fontSize: 22 }} />
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, lineHeight: '18px' }}>
              射频矩阵管理系统
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
            options={satellites.map((s) => ({
              value: s.id,
              label: `${s.satelliteName}（${s.satelliteCode}）`,
            }))}
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
