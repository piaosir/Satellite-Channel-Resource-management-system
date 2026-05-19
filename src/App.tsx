import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { initDB } from '@/db/initDB';
import { useStore } from '@/store/useStore';
import AppLayout from '@/components/AppLayout';
import RoleSelect from '@/pages/RoleSelect';
import Dashboard from '@/pages/Dashboard';
import ResourceQuery from '@/pages/ResourceQuery';
import OccupationManage from '@/pages/OccupationManage';
import ReportExport from '@/pages/ReportExport';

export default function App() {
  const { setDB, dbReady } = useStore();

  useEffect(() => {
    initDB().then(setDB).catch(console.error);
  }, [setDB]);

  if (!dbReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <Spin size="large" />
        <span style={{ color: '#475569', fontSize: 13 }}>正在加载射频矩阵数据库...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/query"      element={<ResourceQuery />} />
          <Route path="/occupation" element={<OccupationManage />} />
          <Route path="/report"     element={<ReportExport />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

