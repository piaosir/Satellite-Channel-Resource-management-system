import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Layout, Menu, Select } from 'antd';
import {
  AppstoreOutlined,
  ApartmentOutlined,
  NodeIndexOutlined,
  BarsOutlined,
  BlockOutlined,
  FileDoneOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import MatrixLogoIcon from '@/components/MatrixLogoIcon';
import { useStore } from '@/store/useStore';
import { fetchSatellites } from '@/api';
import type { Satellite } from '@/types';

const { Sider, Header, Content } = Layout;

const MENU = [
  { key: 'g1', label: '总览', type: 'group' as const, children: [
    { key: '/dashboard', icon: <AppstoreOutlined />, label: '资源总览' },
  ]},
  { key: 'g2', label: '空间段资源', type: 'group' as const, children: [
    { key: '/channels', icon: <BarsOutlined />, label: '通道资源' },
    { key: '/matrix',   icon: <NodeIndexOutlined />, label: '通道交联' },
  ]},
  { key: 'g3', label: '频率资源', type: 'group' as const, children: [
    { key: '/plan',       icon: <ApartmentOutlined />, label: '频率规划' },
    { key: '/allocation', icon: <BlockOutlined />, label: '频率分配和登记' },
  ]},
  { key: 'g4', label: '业务管理', type: 'group' as const, children: [
    { key: '/contracts', icon: <FileDoneOutlined />, label: '合约与交付' },
    { key: '/self-use',  icon: <CloudServerOutlined />, label: '自用载波' },
  ]},
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedSatelliteId, setSatellite } = useStore();
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchSatellites().then((list) => {
      setSatellites(list);
      if (list.length > 0 && !list.some((s) => s.id === selectedSatelliteId)) {
        setSatellite(list[0].id);
      }
    }).catch(console.error);
  }, [selectedSatelliteId, setSatellite]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
              CHANNEL RESOURCE MGMT
            </div>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={MENU}
          style={{ background: 'transparent', border: 'none', flex: 1, overflowY: 'auto' }}
          theme="dark"
        />

        <div
          style={{
            borderTop: '1px solid #1e3a5f',
            padding: '10px 18px',
            color: '#2d4a6e',
            fontSize: 10,
            lineHeight: '16px',
          }}
        >
          <div>CRMS DEMO v0.3</div>
          <div style={{ marginTop: 2 }}>仅供演示，禁止用于生产</div>
        </div>
      </Sider>

      {/* ── 右侧内容区 ── */}
      <Layout style={{ marginLeft: 210 }}>
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
          <span style={{ color: '#4a6a8a', fontSize: 12, whiteSpace: 'nowrap' }}>当前卫星</span>
          <Select
            value={selectedSatelliteId ?? undefined}
            onChange={setSatellite}
            style={{ width: 250 }}
            size="small"
            placeholder="选择卫星"
            showSearch
            optionFilterProp="title"
            options={satellites.map((s) => {
              const off = !!s.statusText && s.statusText !== '在轨运营';
              return {
                value: s.id,
                title: `${s.satelliteName ?? ''}${s.satelliteCode}`,
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
        </Header>

        <Content style={{ background: '#0f172a', minHeight: 'calc(100vh - 50px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
