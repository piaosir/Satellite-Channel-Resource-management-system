import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarOutlined,
  BulbOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  ControlOutlined,
  ApiOutlined,
  CodeOutlined,
  ContainerOutlined,
  AimOutlined,
  CheckOutlined,
  RightOutlined,
} from '@ant-design/icons';
import MatrixLogoIcon from '@/components/MatrixLogoIcon';
import { useStore } from '@/store/useStore';
import type { Role } from '@/store/useStore';

interface RoleDef {
  key: Role;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  permissions: string[];
  color: string;
  level: string;
}

const roles: RoleDef[] = [
  {
    key: 'business_manager',
    label: '商务经理',
    subtitle: 'Business Manager',
    icon: <DollarOutlined />,
    permissions: ['资源查询', '资源统计', '合约记录管理', '使用记录管理'],
    color: '#3b82f6',
    level: 'L2',
  },
  {
    key: 'product_manager',
    label: '产品经理',
    subtitle: 'Product Manager',
    icon: <BulbOutlined />,
    permissions: ['资源查询', '资源统计'],
    color: '#10b981',
    level: 'L2',
  },
  {
    key: 'product_rd',
    label: '产品研发',
    subtitle: 'Product R&D',
    icon: <ExperimentOutlined />,
    permissions: ['资源查询', '资源统计', '资源/载波规划管理'],
    color: '#06b6d4',
    level: 'L2',
  },
  {
    key: 'industry_manager',
    label: '行业经理',
    subtitle: 'Industry Manager',
    icon: <GlobalOutlined />,
    permissions: ['资源查询', '资源统计', '占用管理', '使用记录管理', '合约记录管理'],
    color: '#f59e0b',
    level: 'L2',
  },
  {
    key: 'ops_engineer',
    label: '运控工程师',
    subtitle: 'Operations Engineer',
    icon: <ControlOutlined />,
    permissions: ['资源查询', '资源统计', '使用记录管理'],
    color: '#84cc16',
    level: 'L3',
  },
  {
    key: 'network_engineer',
    label: '网络系统工程师',
    subtitle: 'Network Systems Engineer',
    icon: <ApiOutlined />,
    permissions: ['资源查询', '资源统计', '占用管理', '使用记录管理', '合约记录管理', '地面系统管理'],
    color: '#8b5cf6',
    level: 'L3',
  },
  {
    key: 'digital_engineer',
    label: '数字化工程师',
    subtitle: 'Digital Engineer',
    icon: <CodeOutlined />,
    permissions: ['合约记录管理'],
    color: '#ec4899',
    level: 'L3',
  },
  {
    key: 'inventory_manager',
    label: '库存管理员',
    subtitle: 'Inventory Manager',
    icon: <ContainerOutlined />,
    permissions: ['资源查询', '资源统计'],
    color: '#f97316',
    level: 'L2',
  },
  {
    key: 'ttc_engineer',
    label: '卫星测控工程师',
    subtitle: 'Satellite TT&C Engineer',
    icon: <AimOutlined />,
    permissions: ['资源查询', '通道配置管理', '行波管状态管理'],
    color: '#ef4444',
    level: 'L3',
  },
];

const today = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export default function RoleSelect() {
  const navigate = useNavigate();
  const setRole = useStore((s) => s.setRole);
  const [active, setActive] = useState<Role | null>(null);

  function handleSelect(role: Role) {
    setRole(role);
    navigate('/dashboard');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080f1e',
        display: 'flex',
        flexDirection: 'column',
        color: '#e2e8f0',
        fontFamily: "system-ui, 'Microsoft YaHei', sans-serif",
      }}
    >
      {/* ── 顶部系统栏 ── */}
      <div
        style={{
          height: 48,
          background: '#0c1a2e',
          borderBottom: '1px solid #1e3a5f',
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          gap: 10,
        }}
      >
        <MatrixLogoIcon size={18} />
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}>
          射频矩阵管理系统
        </span>
        <span style={{ color: '#1e3a5f', margin: '0 6px' }}>|</span>
        <span style={{ color: '#2563eb', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.5 }}>
          RF MATRIX MANAGEMENT
        </span>
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
            }}
          />
          系统正常
        </span>
        <span style={{ color: '#2d4a6e', fontSize: 11, fontFamily: 'monospace', marginLeft: 16 }}>
          {today}
        </span>
      </div>

      {/* ── 主体区域 ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
          gap: 48,
        }}
      >
        {/* 系统标题 */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          <div
            style={{
              position: 'relative',
              width: 72,
              height: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
              }}
            />
            <div
              style={{
                width: 64,
                height: 64,
                background: 'rgba(14,30,54,0.9)',
                border: '1px solid rgba(37,99,235,0.35)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 28px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <MatrixLogoIcon size={40} />
            </div>
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: '#e2e8f0',
              letterSpacing: 6,
              lineHeight: 1.15,
            }}
          >
            射频矩阵管理系统
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ width: 40, height: 1, background: 'linear-gradient(to left, #2563eb88, transparent)' }} />
            <span
              style={{
                color: '#3b82f6',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 4,
                fontFamily: "'Courier New', 'Consolas', monospace",
                textTransform: 'uppercase',
                opacity: 0.85,
              }}
            >
              RF · Matrix · Management
            </span>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(to right, #2563eb88, transparent)' }} />
          </div>
        </div>

        {/* 分隔线 */}
        <div
          style={{
            width: '100%',
            maxWidth: 1080,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #1e3a5f)' }} />
          <span style={{ color: '#2d4a6e', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, whiteSpace: 'nowrap' }}>
            ROLE SELECTION
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, #1e3a5f)' }} />
        </div>

        {/* 角色卡片网格 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(3, minmax(0, 1fr))`,
            gap: 20,
            width: '100%',
            maxWidth: 1080,
          }}
        >
          {roles.map((r) => (
            <RoleCard
              key={r.key}
              role={r}
              isActive={active === r.key}
              onHover={() => setActive(r.key)}
              onLeave={() => setActive(null)}
              onClick={() => handleSelect(r.key)}
            />
          ))}
        </div>

        {/* 底部提示 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#1e3a5f',
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        >
          <span style={{ display: 'inline-block', width: 1, height: 12, background: '#1e3a5f' }} />
          RFMATRIX DEMO v0.1 · 数据仅供演示，禁止用于生产环境
          <span style={{ display: 'inline-block', width: 1, height: 12, background: '#1e3a5f' }} />
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  role,
  isActive,
  onHover,
  onLeave,
  onClick,
}: {
  role: RoleDef;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const { color, label, subtitle, icon, permissions, level } = role;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        background: isActive ? `rgba(${hexToRgb(color)}, 0.06)` : '#0d1b2e',
        border: `1px solid ${isActive ? color + '66' : '#1e3a5f'}`,
        borderRadius: 4,
        padding: '24px 22px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        boxShadow: isActive ? `0 0 24px ${color}22` : 'none',
      }}
    >
      {/* 级别标签（右上角） */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 16,
          fontSize: 10,
          fontFamily: 'monospace',
          color: color + 'aa',
          letterSpacing: 1,
          border: `1px solid ${color}33`,
          padding: '1px 6px',
          borderRadius: 2,
        }}
      >
        {level}
      </div>

      {/* 图标 + 角色名 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingRight: 32 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 4,
            background: `${color}18`,
            border: `1px solid ${color}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, lineHeight: '22px' }}>
            {label}
          </div>
          <div style={{ color: '#2d4a6e', fontSize: 10, fontFamily: 'monospace', marginTop: 2, letterSpacing: 0.5 }}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* 权限列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {permissions.map((p) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckOutlined style={{ color: color + 'cc', fontSize: 10, flexShrink: 0 }} />
            <span style={{ color: '#64748b', fontSize: 12 }}>{p}</span>
          </div>
        ))}
      </div>

      {/* 进入按钮 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 12,
          borderTop: `1px solid ${isActive ? color + '33' : '#1e3a5f'}`,
          transition: 'border-color 0.18s',
        }}
      >
        <span
          style={{
            color: isActive ? color : '#2d4a6e',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.5,
            transition: 'color 0.18s',
          }}
        >
          以此身份进入
        </span>
        <RightOutlined
          style={{
            color: isActive ? color : '#1e3a5f',
            fontSize: 11,
            transition: 'color 0.18s, transform 0.18s',
            transform: isActive ? 'translateX(3px)' : 'none',
          }}
        />
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
