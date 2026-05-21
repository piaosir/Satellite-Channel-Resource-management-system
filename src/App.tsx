import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import RoleSelect from '@/pages/RoleSelect';
import Dashboard from '@/pages/Dashboard';
import ResourceQuery from '@/pages/ResourceQuery';
import OccupationManage from '@/pages/OccupationManage';
import ReportExport from '@/pages/ReportExport';

export default function App() {
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

