interface Props {
  size?: number;
  style?: React.CSSProperties;
}

/**
 * 矩阵风格的射频矩阵 Logo
 * 4×4 方格网格，首行首列为表头（深蓝），其余格子表示占用/空闲状态
 */
export default function MatrixLogoIcon({ size = 22, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      {/* ── 第 0 行：表头行 ── */}
      <rect x="1"  y="1"  width="4" height="4" rx="0.6" fill="#1e40af" opacity="0.55" />
      <rect x="7"  y="1"  width="4" height="4" rx="0.6" fill="#2563eb" opacity="0.75" />
      <rect x="13" y="1"  width="4" height="4" rx="0.6" fill="#2563eb" opacity="0.75" />
      <rect x="19" y="1"  width="4" height="4" rx="0.6" fill="#2563eb" opacity="0.75" />

      {/* ── 第 1 行 ── */}
      <rect x="1"  y="7"  width="4" height="4" rx="0.6" fill="#2563eb" opacity="0.75" />  {/* 表头列 */}
      <rect x="7"  y="7"  width="4" height="4" rx="0.6" fill="#3b82f6" />                {/* 已占用 */}
      <rect x="13" y="7"  width="4" height="4" rx="0.6" fill="#0f2744" />                {/* 空闲 */}
      <rect x="19" y="7"  width="4" height="4" rx="0.6" fill="#2563eb" opacity="0.55" />  {/* 部分 */}

      {/* ── 第 2 行 ── */}
      <rect x="1"  y="13" width="4" height="4" rx="0.6" fill="#2563eb" opacity="0.75" />
      <rect x="7"  y="13" width="4" height="4" rx="0.6" fill="#0f2744" />
      <rect x="13" y="13" width="4" height="4" rx="0.6" fill="#3b82f6" />
      <rect x="19" y="13" width="4" height="4" rx="0.6" fill="#0f2744" />

      {/* ── 第 3 行 ── */}
      <rect x="1"  y="19" width="4" height="4" rx="0.6" fill="#2563eb" opacity="0.75" />
      <rect x="7"  y="19" width="4" height="4" rx="0.6" fill="#2563eb" opacity="0.45" />
      <rect x="13" y="19" width="4" height="4" rx="0.6" fill="#0f2744" />
      <rect x="19" y="19" width="4" height="4" rx="0.6" fill="#3b82f6" />
    </svg>
  );
}
