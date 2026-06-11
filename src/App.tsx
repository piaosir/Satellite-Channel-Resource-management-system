import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ChannelResources from '@/pages/ChannelResources';
import MatrixView from '@/pages/MatrixView';
import FreqPlanning from '@/pages/FreqPlanning';
import FreqAllocation from '@/pages/FreqAllocation';
import Contracts from '@/pages/Contracts';
import SelfUse from '@/pages/SelfUse';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/channels"   element={<ChannelResources />} />
          <Route path="/matrix"     element={<MatrixView />} />
          <Route path="/plan"       element={<FreqPlanning />} />
          <Route path="/allocation" element={<FreqAllocation />} />
          <Route path="/contracts"  element={<Contracts />} />
          <Route path="/self-use"   element={<SelfUse />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
