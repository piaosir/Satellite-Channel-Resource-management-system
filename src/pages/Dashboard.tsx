import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, ToolOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { querySatellites } from '@/db/queries';
import { PERMISSIONS } from '@/utils/roleGuard';

interface FuncCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
  path: string;
  color: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { db, role, selectedSatelliteId, setSatellite } = useStore();

  // 若还没有选中卫星，自动选第一颗
  useEffect(() => {
    if (!db || selectedSatelliteId) return;
    const list = querySatellites(db);
    if (list.length > 0) setSatellite(list[0].id);
  }, [db, selectedSatelliteId, setSatellite]);

  const cards: FuncCard[] = [
    {
      icon: <SearchOutlined />,
      title: '资源查询',
      desc: '查看卫星转发器频率占用状态，支持频段/极化等多维筛选',
      path: '/query',
      color: '#3b82f6',
    },
    ...(role && PERMISSIONS.canManageOccupation(role)
      ? [
          {
            icon: <ToolOutlined />,
            title: '占用管理',
            desc: '新建、编辑、删除频率占用记录，支持实时冲突检测',
            path: '/occupation',
            color: '#f59e0b',
          } as FuncCard,
        ]
      : []),
    {
      icon: <FileExcelOutlined />,
      title: '报表导出',
      desc: '自定义字段，导出 Excel 格式的射频矩阵占用报表',
      path: '/report',
      color: '#10b981',
    },
  ];

  return (
    <div style={{ padding: '48px 48px 32px' }}>
        <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
          功能选择
        </h2>
        <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 40px' }}>
          工作台
        </h1>
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

