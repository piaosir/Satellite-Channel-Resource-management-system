import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  HolderOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { useStore } from '@/store/useStore';
import { fetchFrequencyBlocksBySatellite } from '@/api';
import type { FrequencyBlockFull } from '@/types';
import { fmtPolarization, fmtTxRxType, fmtPartitionStatus, fmtSwitchStatus } from '@/utils/freqCalc';

type OccRow = FrequencyBlockFull;

interface FieldDef {
  key: keyof OccRow;
  label: string;
  defaultChecked: boolean;
  group: string;
}

const ALL_FIELDS: FieldDef[] = [
  // ── 占用信息 ──────────────────────────────────────────────
  { key: 'id',                    label: '记录ID',               defaultChecked: false, group: '占用信息' },
  { key: 'frequencyBlockCode2',   label: '频率块代码',           defaultChecked: true,  group: '占用信息' },
  { key: 'productInstanceCode',   label: '商品实例编码',         defaultChecked: false, group: '占用信息' },
  { key: 'occupationStatus',      label: '占用状态',             defaultChecked: true,  group: '占用信息' },
  { key: 'occupiedBandwidth',     label: '占用带宽 (MHz)',       defaultChecked: true,  group: '占用信息' },
  { key: 'frequencyOffset',       label: '频率偏移量 (MHz)',     defaultChecked: false, group: '占用信息' },
  { key: 'occupationStartTimeMs', label: '占用开始时间',         defaultChecked: true,  group: '占用信息' },
  { key: 'occupationEndTimeMs',   label: '占用结束时间',         defaultChecked: true,  group: '占用信息' },
  // ── 实际频率（计算字段） ──────────────────────────────────
  { key: 'rxActualStartFreq',     label: '上行实际起始频率 (MHz)', defaultChecked: true,  group: '实际频率' },
  { key: 'rxActualEndFreq',       label: '上行实际终止频率 (MHz)', defaultChecked: true,  group: '实际频率' },
  { key: 'txActualStartFreq',     label: '下行实际起始频率 (MHz)', defaultChecked: true,  group: '实际频率' },
  { key: 'txActualEndFreq',       label: '下行实际终止频率 (MHz)', defaultChecked: true,  group: '实际频率' },
  // ── 通道/开关 ───────────────────────────────────────────────
  { key: 'transponderName',       label: '通道名称',           defaultChecked: true,  group: '通道/开关' },
  { key: 'switchCode',            label: '开关编码',             defaultChecked: false, group: '通道/开关' },
  { key: 'switchId',              label: '开关ID',               defaultChecked: false, group: '通道/开关' },
  { key: 'switchStatus',          label: '开关状态',             defaultChecked: false, group: '通道/开关' },
  { key: 'switchType',            label: '开关类型',             defaultChecked: false, group: '通道/开关' },
  { key: 'twtValidStatusCode',    label: '有效TWT编码',          defaultChecked: false, group: '通道/开关' },
  { key: 'inputChannelCodeShort', label: '上行通道代码',         defaultChecked: false, group: '通道/开关' },
  { key: 'outputChannelCodeShort',label: '下行通道代码',         defaultChecked: false, group: '通道/开关' },
  // ── 矩阵 ──────────────────────────────────────────────────
  { key: 'matrixCode',            label: '矩阵代码',             defaultChecked: false, group: '矩阵' },
  { key: 'satelliteCode',         label: '卫星代号',             defaultChecked: false, group: '矩阵' },
  { key: 'areaNo',                label: '矩阵区号',             defaultChecked: false, group: '矩阵' },
  { key: 'groupNo',               label: '矩阵组号',             defaultChecked: false, group: '矩阵' },
  // ── 通道组 ────────────────────────────────────────────────
  { key: 'band',                  label: '频段',                 defaultChecked: true,  group: '通道组' },
  { key: 'polarization',          label: '极化',                 defaultChecked: true,  group: '通道组' },
  { key: 'txRxType',              label: '收发类型',             defaultChecked: false, group: '通道组' },
  { key: 'antennaName',           label: '天线名称',             defaultChecked: false, group: '通道组' },
  { key: 'channelGroupCode',      label: '通道组代码',           defaultChecked: false, group: '通道组' },
  // ── 上行通道 ──────────────────────────────────────────────
  { key: 'channelStartFreq',      label: '上行通道起始频率 (MHz)', defaultChecked: false, group: '上行通道' },
  { key: 'channelEndFreq',        label: '上行通道终止频率 (MHz)', defaultChecked: false, group: '上行通道' },
  { key: 'channelBandwidth',      label: '上行通道带宽 (MHz)',   defaultChecked: false, group: '上行通道' },
  // ── 下行通道 ──────────────────────────────────────────────
  { key: 'txChannelStartFreq',    label: '下行通道起始频率 (MHz)', defaultChecked: false, group: '下行通道' },
  { key: 'txChannelEndFreq',      label: '下行通道终止频率 (MHz)', defaultChecked: false, group: '下行通道' },
  { key: 'txChannelBandwidth',    label: '下行通道带宽 (MHz)',   defaultChecked: false, group: '下行通道' },
];

const FIELD_GROUPS = [...new Set(ALL_FIELDS.map((f) => f.group))];

const STATUS_COLOR: Record<string, string> = { P: 'blue', R: 'green' };

function fmtVal(key: string, value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (key === 'polarization' || key === 'txPolarization') return fmtPolarization(String(value));
  if (key === 'txRxType') return fmtTxRxType(String(value));
  if (key === 'partitionStatus' || key === 'occupationStatus') return fmtPartitionStatus(String(value));
  if (key === 'switchStatus') return fmtSwitchStatus(Number(value));
  return String(value);
}

export default function ReportExport() {
  const navigate = useNavigate();
  const { role, selectedSatelliteId } = useStore();

  // selectedFields 的顺序即为导出列顺序
  const [selectedFields, setSelectedFields] = useState<string[]>(
    ALL_FIELDS.filter((f) => f.defaultChecked).map((f) => f.key),
  );

  // 筛选条件
  const [bandFilter,   setBandFilter]   = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [polarFilter,  setPolarFilter]  = useState<string[]>([]);

  // 异步加载原始数据
  const [rawData, setRawData] = useState<OccRow[]>([]);
  useEffect(() => {
    if (!selectedSatelliteId) { setRawData([]); return; }
    fetchFrequencyBlocksBySatellite(selectedSatelliteId).then(setRawData).catch(console.error);
  }, [selectedSatelliteId]);

  // 拖拽排序
  const [dragIdx,     setDragIdx]     = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (role === null) navigate('/', { replace: true });
  }, [role, navigate]);

  const availableBands = useMemo(
    () => [...new Set(rawData.map((r) => r.band).filter(Boolean))].sort() as string[],
    [rawData],
  );
  const availablePolarizations = useMemo(
    () => [...new Set(rawData.map((r) => r.polarization).filter(Boolean))].sort() as string[],
    [rawData],
  );

  const data = useMemo(() => {
    return rawData.filter((row) => {
      if (bandFilter.length > 0   && !bandFilter.includes(row.band))               return false;
      if (statusFilter.length > 0 && !statusFilter.includes(row.partitionStatus))  return false;
      if (polarFilter.length > 0  && !polarFilter.includes(row.polarization ?? '')) return false;
      return true;
    });
  }, [rawData, bandFilter, statusFilter, polarFilter]);

  // 激活字段列表：顺序严格按 selectedFields 排列
  const activeFields = useMemo(
    () => selectedFields.map((k) => ALL_FIELDS.find((f) => f.key === k)).filter(Boolean) as FieldDef[],
    [selectedFields],
  );

  const columns = useMemo(
    () =>
      activeFields.map((f) => ({
        title: f.label,
        dataIndex: f.key,
        key: f.key,
        render: (val: unknown) => {
          if (f.key === 'partitionStatus') {
            const s = val as string;
            return <Tag color={STATUS_COLOR[s] ?? 'default'}>{s === 'P' ? 'P划分' : s === 'R' ? 'R空闲' : (s ?? '-')}</Tag>;
          }
          return <span style={{ color: '#cbd5e1', fontSize: 12 }}>{fmtVal(f.key, val)}</span>;
        },
      })),
    [activeFields],
  );

  // ── 字段勾选（追加到末尾以保留点击顺序） ──────────────────
  function toggleField(key: string, checked: boolean) {
    if (checked) {
      setSelectedFields((prev) => [...prev, key]);
    } else {
      setSelectedFields((prev) => prev.filter((k) => k !== key));
    }
  }

  function toggleGroup(groupKeys: string[], checked: boolean) {
    if (checked) {
      setSelectedFields((prev) => [...prev, ...groupKeys.filter((k) => !prev.includes(k))]);
    } else {
      setSelectedFields((prev) => prev.filter((k) => !groupKeys.includes(k)));
    }
  }

  // ── 拖拽排序 ──────────────────────────────────────────────
  function handleDrop(toIdx: number) {
    if (dragIdx === null || dragIdx === toIdx) return;
    const next = [...selectedFields];
    const [item] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, item);
    setSelectedFields(next);
    setDragIdx(null);
    setDragOverIdx(null);
  }

  function moveField(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= selectedFields.length) return;
    const next = [...selectedFields];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSelectedFields(next);
  }

  // ── 导出 ──────────────────────────────────────────────────
  async function exportExcel() {
    if (data.length === 0) { message.warning('没有数据可导出'); return; }
    const font: Partial<ExcelJS.Font> = { name: '仿宋', size: 12 };
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('频率占用报表');
    ws.columns = activeFields.map((f) => ({
      width: Math.max(f.label.replace(/[\u4e00-\u9fa5]/g, 'aa').length * 1.1, 14),
    }));
    const headerRow = ws.addRow(activeFields.map((f) => f.label));
    headerRow.font = { ...font, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 18;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF4A90D9' } } };
    });
    data.forEach((row) => {
      const dr = ws.addRow(activeFields.map((f) => fmtVal(f.key, row[f.key])));
      dr.font = font;
      dr.height = 16;
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `频率占用报表_${dayjs().format('YYYYMMDDHHmm')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Excel 导出成功');
  }

  function exportCSV() {
    if (data.length === 0) { message.warning('没有数据可导出'); return; }
    const header   = activeFields.map((f) => `"${f.label}"`).join(',');
    const rowLines = data.map((row) =>
      activeFields.map((f) => `"${fmtVal(f.key, row[f.key]).replace(/"/g, '""')}"`).join(','),
    );
    const csv = '\uFEFF' + [header, ...rowLines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `频率占用报表_${dayjs().format('YYYYMMDDHHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('CSV 导出成功');
  }

  const cardStyle     = { background: '#1e293b', border: '1px solid #334155' };
  const cardHeadStyle = { borderBottom: '1px solid #334155', color: '#e2e8f0' };

  return (
    <div style={{ padding: '12px 20px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ color: '#e2e8f0', margin: 0, fontSize: 15, fontWeight: 600 }}>报表导出</h2>
        <p style={{ color: '#64748b', margin: '2px 0 0', fontSize: 12 }}>
          自定义导出字段与列顺序，支持多条件筛选，导出 Excel / CSV 格式
        </p>
      </div>

      <Row gutter={16} align="top">
        {/* ── 左侧：字段选择 + 列顺序 ── */}
        <Col xs={24} lg={6}>

          {/* 字段选择 */}
          <Card
            title={
              <span style={{ fontSize: 12 }}>
                导出字段
                <span style={{ color: '#475569', fontWeight: 400, marginLeft: 6 }}>
                  已选 {selectedFields.length}/{ALL_FIELDS.length}
                </span>
              </span>
            }
            style={{ ...cardStyle, marginBottom: 12 }}
            styles={{
              header: { ...cardHeadStyle, padding: '6px 12px', minHeight: 36 },
              body:   { padding: '8px 12px', maxHeight: 'calc(52vh - 80px)', overflowY: 'auto' },
            }}
            extra={
              <Space size={2}>
                <Button size="small" type="link" style={{ padding: '0 4px', fontSize: 11 }}
                  onClick={() => setSelectedFields(ALL_FIELDS.map((f) => f.key))}>全选</Button>
                <Button size="small" type="link" style={{ padding: '0 4px', fontSize: 11, color: '#ef4444' }}
                  onClick={() => setSelectedFields([])}>清空</Button>
                <Button size="small" type="link" style={{ padding: '0 4px', fontSize: 11 }}
                  onClick={() => setSelectedFields(ALL_FIELDS.filter((f) => f.defaultChecked).map((f) => f.key))}>
                  重置
                </Button>
              </Space>
            }
          >
            {FIELD_GROUPS.map((group) => {
              const groupFields  = ALL_FIELDS.filter((f) => f.group === group);
              const groupKeys    = groupFields.map((f) => f.key);
              const checkedCount = groupKeys.filter((k) => selectedFields.includes(k)).length;
              const allChecked   = checkedCount === groupKeys.length;
              const indeterminate = checkedCount > 0 && !allChecked;
              return (
                <div key={group} style={{ marginBottom: 10 }}>
                  <Checkbox
                    indeterminate={indeterminate}
                    checked={allChecked}
                    style={{ color: '#60a5fa', fontWeight: 600, fontSize: 11, marginBottom: 4 }}
                    onChange={(e) => toggleGroup(groupKeys, e.target.checked)}
                  >
                    {group}
                  </Checkbox>
                  <div style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {groupFields.map((f) => (
                      <Checkbox
                        key={f.key}
                        checked={selectedFields.includes(f.key)}
                        style={{ color: '#94a3b8', marginLeft: 0, fontSize: 11 }}
                        onChange={(e) => toggleField(f.key, e.target.checked)}
                      >
                        {f.label}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              );
            })}
          </Card>

          {/* 列顺序 */}
          <Card
            title={
              <span style={{ fontSize: 12 }}>
                列顺序
                <span style={{ color: '#475569', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                  拖拽或↑↓调整
                </span>
              </span>
            }
            style={cardStyle}
            styles={{
              header: { ...cardHeadStyle, padding: '6px 12px', minHeight: 36 },
              body:   { padding: '8px 12px', maxHeight: 'calc(38vh - 80px)', overflowY: 'auto' },
            }}
          >
            {selectedFields.length === 0 ? (
              <div style={{ color: '#334155', fontSize: 11, textAlign: 'center', padding: '12px 0' }}>
                请先勾选字段
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {selectedFields.map((key, idx) => {
                  const field      = ALL_FIELDS.find((f) => f.key === key)!;
                  const isDragOver = dragOverIdx === idx;
                  const isDragging = dragIdx === idx;
                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 6px',
                        borderRadius: 3,
                        background: isDragOver ? '#1e3a5f' : isDragging ? '#0a1628' : '#0d1b2e',
                        border: `1px solid ${isDragOver ? '#3b82f6' : '#1e3a5f'}`,
                        cursor: 'grab',
                        opacity: isDragging ? 0.45 : 1,
                        transition: 'background 0.1s, border-color 0.1s',
                        userSelect: 'none',
                      }}
                    >
                      <HolderOutlined style={{ color: '#2d4a6e', fontSize: 10, flexShrink: 0 }} />
                      <span
                        style={{
                          flex: 1, color: '#94a3b8', fontSize: 11,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        <span style={{ color: '#2d4a6e', marginRight: 4, fontSize: 10, fontFamily: 'monospace' }}>
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        {field.label}
                      </span>
                      <Tooltip title="上移">
                        <ArrowUpOutlined
                          style={{ color: idx === 0 ? '#1e3a5f' : '#4a6a8a', fontSize: 10,
                                   cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                          onClick={() => moveField(idx, -1)}
                        />
                      </Tooltip>
                      <Tooltip title="下移">
                        <ArrowDownOutlined
                          style={{ color: idx === selectedFields.length - 1 ? '#1e3a5f' : '#4a6a8a', fontSize: 10,
                                   cursor: idx === selectedFields.length - 1 ? 'not-allowed' : 'pointer' }}
                          onClick={() => moveField(idx, 1)}
                        />
                      </Tooltip>
                      <Tooltip title="移除">
                        <CloseOutlined
                          style={{ color: '#475569', fontSize: 9, cursor: 'pointer' }}
                          onClick={() => toggleField(key, false)}
                        />
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* ── 右侧：筛选 + 预览 ── */}
        <Col xs={24} lg={18}>
          {/* 筛选条件 */}
          <Card
            title={<span style={{ fontSize: 12 }}>筛选条件</span>}
            style={{ ...cardStyle, marginBottom: 10 }}
            styles={{ header: { ...cardHeadStyle, padding: '6px 12px', minHeight: 36 } }}
          >
            <Row gutter={[12, 10]} align="bottom">
              <Col xs={24} sm={6}>
                <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 3 }}>频段</div>
                <Select mode="multiple" allowClear style={{ width: '100%' }}
                  placeholder="全部频段" value={bandFilter} onChange={setBandFilter}
                  options={availableBands.map((b) => ({ value: b, label: b }))}
                />
              </Col>
              <Col xs={24} sm={6}>
                <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 3 }}>极化方式</div>
                <Select mode="multiple" allowClear style={{ width: '100%' }}
                  placeholder="全部极化" value={polarFilter} onChange={setPolarFilter}
                  options={availablePolarizations.map((p) => ({ value: p, label: p }))}
                />
              </Col>
              <Col xs={24} sm={6}>
                <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 3 }}>占用状态</div>
                <Select mode="multiple" allowClear style={{ width: '100%' }}
                  placeholder="全部状态" value={statusFilter} onChange={setStatusFilter}
                  options={[
                    { value: 'P', label: 'P 划分（在用）' },
                    { value: 'R', label: 'R 回收（空闲）' },
                  ]}
                />
              </Col>
              <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" icon={<ReloadOutlined />} style={{ fontSize: 12 }}
                  onClick={() => {
                    setBandFilter([]); setStatusFilter([]); setPolarFilter([]);
                  }}
                >
                  重置筛选
                </Button>
              </Col>
            </Row>
          </Card>

          {/* 数据预览 + 导出 */}
          <Card
            title={
              <Space>
                <span style={{ color: '#e2e8f0', fontSize: 12 }}>数据预览</span>
                <span style={{ color: '#64748b', fontSize: 11, fontWeight: 400 }}>
                  {data.length} 条记录
                  {data.length !== rawData.length && `（原始 ${rawData.length} 条）`}
                </span>
              </Space>
            }
            style={cardStyle}
            styles={{ header: { ...cardHeadStyle, padding: '6px 12px', minHeight: 36 } }}
            extra={
              <Space>
                <Button size="small" icon={<FileExcelOutlined />} type="primary"
                  style={{ background: '#16a34a', borderColor: '#16a34a', fontSize: 12 }}
                  onClick={exportExcel}
                  disabled={data.length === 0 || activeFields.length === 0}
                >
                  导出 Excel
                </Button>
                <Button size="small" icon={<DownloadOutlined />} onClick={exportCSV}
                  style={{ fontSize: 12 }}
                  disabled={data.length === 0 || activeFields.length === 0}
                >
                  导出 CSV
                </Button>
              </Space>
            }
          >
            <Table
              dataSource={data}
              columns={columns}
              rowKey="id"
              size="small"
              scroll={{ x: 'max-content', y: 400 }}
              pagination={{
                pageSize: 20, showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `共 ${total} 条`,
                size: 'small',
                style: { color: '#94a3b8', fontSize: 12 },
              }}
              locale={{ emptyText: <span style={{ color: '#475569', fontSize: 12 }}>暂无数据</span> }}
              style={{ color: '#94a3b8', fontSize: 12 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
