const SYSTEMS = [
  { name: '北京关口站', ip: '10.10.1.10', location: '北京', type: '关口站', online: true, syncTime: '2025-05-28 14:32:05' },
  { name: '上海信关站', ip: '10.10.2.20', location: '上海', type: '信关站', online: true, syncTime: '2025-05-28 14:32:01' },
  { name: '广州监控中心', ip: '10.10.3.30', location: '广州', type: '监控中心', online: true, syncTime: '2025-05-28 14:31:58' },
  { name: '西安地面站', ip: '10.10.4.40', location: '西安', type: '地面站', online: false, syncTime: '2025-05-28 10:15:22' },
  { name: '成都备份站', ip: '10.10.5.50', location: '成都', type: '备份站', online: true, syncTime: '2025-05-28 14:32:03' },
  { name: '哈尔滨测控站', ip: '10.10.6.60', location: '哈尔滨', type: '测控站', online: true, syncTime: '2025-05-28 14:31:55' },
  { name: '乌鲁木齐接收站', ip: '10.10.7.70', location: '乌鲁木齐', type: '接收站', online: false, syncTime: '2025-05-28 08:44:10' },
  { name: '海南卫星地面站', ip: '10.10.8.80', location: '海南', type: '地面站', online: true, syncTime: '2025-05-28 14:32:07' },
];

const typeColors: Record<string, string> = {
  '关口站':   '#3b82f6',
  '信关站':   '#06b6d4',
  '监控中心': '#8b5cf6',
  '地面站':   '#10b981',
  '备份站':   '#f59e0b',
  '测控站':   '#ef4444',
  '接收站':   '#ec4899',
};

export default function GroundSystem() {
  const online = SYSTEMS.filter((s) => s.online).length;
  const total = SYSTEMS.length;

  return (
    <div style={{ padding: '40px 48px 32px', color: '#e2e8f0' }}>
      <h2 style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, margin: '0 0 8px', letterSpacing: 2 }}>
        基础设施
      </h2>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>
        地面系统管理
      </h1>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 32 }}>
        在线 <span style={{ color: '#22c55e', fontWeight: 600 }}>{online}</span> / {total} 个站点
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        {SYSTEMS.map((s) => {
          const color = typeColors[s.type] ?? '#64748b';
          return (
            <div
              key={s.ip}
              style={{
                background: '#1e293b',
                border: `1px solid ${s.online ? '#334155' : '#4b1f1f'}`,
                borderRadius: 10,
                padding: '20px 22px',
                position: 'relative',
              }}
            >
              {/* 在线状态指示点 */}
              <div
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  color: s.online ? '#22c55e' : '#ef4444',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: s.online ? '#22c55e' : '#ef4444',
                    boxShadow: s.online ? '0 0 6px #22c55e88' : 'none',
                    display: 'inline-block',
                  }}
                />
                {s.online ? '在线' : '离线'}
              </div>

              {/* 类型标签 */}
              <div
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  color,
                  border: `1px solid ${color}44`,
                  padding: '2px 8px',
                  borderRadius: 3,
                  marginBottom: 10,
                  background: `${color}12`,
                }}
              >
                {s.type}
              </div>

              <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                {s.name}
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                位置：{s.location}
              </div>
              <div style={{ color: '#4a6a8a', fontSize: 12, fontFamily: 'monospace', marginBottom: 12 }}>
                {s.ip}
              </div>
              <div
                style={{
                  borderTop: '1px solid #1e3a5f',
                  paddingTop: 10,
                  fontSize: 11,
                  color: '#475569',
                }}
              >
                上次同步：{s.syncTime}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
