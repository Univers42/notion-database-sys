import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { SchemaProperty, SelectOption, StatusGroup, RollupFunction, RollupDisplayAs } from '../types/database';
import {
  X, Search, ArrowUpRight, ChevronDown, ChevronRight, ExternalLink,
  CheckCircle2, CircleDot, Fingerprint, GitBranch, Hash, Settings,
  Plus, Database as DbIcon, BarChart2
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED: Portal wrapper that anchors to a cell's bounding rect
// ═══════════════════════════════════════════════════════════════════════════════

function useCellRect(measureRef: React.RefObject<HTMLDivElement | null>) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (measureRef.current) {
      const td = measureRef.current.closest('td');
      if (td) setRect(td.getBoundingClientRect());
    }
  }, [measureRef]);
  return rect;
}

// ═══════════════════════════════════════════════════════════════════════════════

export { useCellRect };
