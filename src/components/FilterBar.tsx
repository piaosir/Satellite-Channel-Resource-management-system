import { useState } from 'react';
import { Select, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

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
}

export default function FilterBar({
  onFilter,
  availableTransponders,
  availableBands,
  availablePolarizations,
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
            placeholder="转发器"
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
          options={(availablePolarizations ?? ['H', 'V']).map((p) => ({
            value: p,
            label: p === 'H' ? 'H 水平' : p === 'V' ? 'V 垂直' : p,
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
          placeholder="占用状态"
          value={occStatus}
          onChange={setOccStatus}
          style={{ width: 110 }}
          options={[
            { value: '占用', label: '已占用' },
            { value: '空闲', label: '空闲' },
            { value: '干扰', label: '干扰' },
          ]}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          查询
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>
    </div>
  );
}

