import { useEffect, useRef, useState } from 'react';

/** 监听容器宽度(SVG 自适应用) */
export function useContainerWidth(min = 320): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => {
      for (const e of es) setW(Math.max(min, e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, w];
}
