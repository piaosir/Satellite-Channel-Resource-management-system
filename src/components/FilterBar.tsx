import { useState } from 'react';
import { Select, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { fmtPolarization } from '@/utils/freqCalc';

export interface FilterValues {
  transponderSwitchId?: number;
  band?: string;
  polarization?: string;
  switchStatus?: number;
  occStatus?: string;
}

interface FilterBarProps {
  onFilter: (filters: FilterValues) => void;
  availableTransponders?: { switchId: number; label: string }[];
  availableBands?: string[];
  availablePolarizations?: string[];
  occStatusOptions?: { value: string; label: string }[];
  occStatusPlaceholder?: string;
}

const DEFAULT_OCC_STATUS_OPTIONS = [
  { value: 'P', label: 'P 划分（在用）' },
  { value: 'R', label: 'R 回收（空闲）' },
];

export default function FilterBar({
  onFilter,
  availableTransponders,
  availableBands,
  availablePolarizations,
  occStatusOptions = DEFAULT_OCC_STATUS_OPTIONS,
  occStatusPlaceholder = '占用状态',
}: FilterBarProps) {
  const [transponderSwitchId, setTransponderSwitchId] = useState<number | undefined>();
  const [band, setBand]                               = useState<string | undefined>();
  const [polarization, setPolarization]               = useState<string | undefined>();
  const [switchStatus, setSwitchStatus]               = useState<number | undefined>();
  const [occStatus, setOccStatus]                     = useState<string | undefined>();

  function handleSearch() {
    onFilter({ transponderSwitchId, band, polarization, switchStatus, occStatus });
  }

  function handleReset() {
    setTransponderSwitchId(undefined);
    setBand(undefined);
    setPolarization(undefined);
    setSwitchStatus(undefined);
    setOccStatus(undefined);
    onFilter({});
  }

  return (
    <div
      style={{
        padding: '12px 24px',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
      }}
    >
      <Space wrap>
        {availableTransponders !== undefined && (
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="通道"
            value={transponderSwitchId}
            onChange={setTransponderSwitchId}
            style={{ width: 180 }}
            options={availableTransponders.map((t) => ({ value: t.switchId, label: t.label }))}
          />
        )}
        <Select
          allowClear
          placeholder="频段"
          value={band}
          onChange={setBand}
          style={{ width: 100 }}
          options={(availableBands ?? ['Ku', 'EKu', 'C']).map((b) => ({ value: b, label: b }))}
        />
        <Select
          allowClear
          placeholder="极化"
          value={polarization}
          onChange={setPolarization}
          style={{ width: 90 }}
          options={(availablePolarizations ?? ['H', 'V', 'L', 'R', 'Z']).map((p) => ({
            value: p,
            label: fmtPolarization(p),
          }))}
        />
        <Select
          allowClear
          placeholder="开关状态"
          value={switchStatus}
          onChange={setSwitchStatus}
          style={{ width: 110 }}
          options={[
            { value: 1, label: '✅ 开' },
            { value: 0, label: '⛔ 关' },
          ]}
        />
        <Select
          allowClear
          placeholder={occStatusPlaceholder}
          value={occStatus}
          onChange={setOccStatus}
          style={{ width: 120 }}
          options={occStatusOptions}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          查询
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>
    </div>
  );
}

