import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import RoleSelect from '@/pages/RoleSelect';
import Dashboard from '@/pages/Dashboard';
import ResourceQuery from '@/pages/ResourceQuery';
import ResourceStats from '@/pages/ResourceStats';
import OccupationManage from '@/pages/OccupationManage';
import ContractRecords from '@/pages/ContractRecords';
import UsageRecords from '@/pages/UsageRecords';
import CarrierPlanning from '@/pages/CarrierPlanning';
import GroundSystem from '@/pages/GroundSystem';
import ChannelConfig from '@/pages/ChannelConfig';
import TWTAManage from '@/pages/TWTAManage';
import ReportExport from '@/pages/ReportExport';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/query"         element={<ResourceQuery />} />
          <Route path="/stats"         element={<ResourceStats />} />
          <Route path="/occupation"    element={<OccupationManage />} />
          <Route path="/contracts"     element={<ContractRecords />} />
          <Route path="/usage"         element={<UsageRecords />} />
          <Route path="/planning"      element={<CarrierPlanning />} />
          <Route path="/ground"        element={<GroundSystem />} />
          <Route path="/channel-config" element={<ChannelConfig />} />
          <Route path="/twta"          element={<TWTAManage />} />
          <Route path="/report"        element={<ReportExport />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
