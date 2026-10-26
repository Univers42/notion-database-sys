import { useEffect, useRef, useState } from 'react';

/** Live box size of an element plus whether it sits inside a dashboard widget
 *  (whose card already carries the title, so the chart drops its own chrome). */
export function useChartSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ width: 0, height: 0, compact: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const compact = !!el.closest('[data-dash-widget]');
    const read = () => setState(prev => {
      const width = Math.round(el.clientWidth);
      const height = Math.round(el.clientHeight);
      return prev.width === width && prev.height === height && prev.compact === compact
        ? prev : { width, height, compact };
    });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, ...state };
}
