import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripHandleIcon } from './Icons';
import { ActionPanel, type ActionPanelProps } from './ActionPanel';

// ═══════════════════════════════════════════════════════════════════════════════
// BlockHandle — the "dotted square" drag handle that Notion shows on hover.
//
// Features:
//   1. Appears only when hovering the parent area
//   2. Positioned to the left of the target element, slightly offset
//   3. Supports drag-and-drop (reorder / move)
//   4. Supports click → opens an ActionPanel (configurable)
//   5. Easily attachable to any component via wrapping or render-prop
//
// Usage (wrapper mode — wraps children):
//   <BlockHandle panelProps={{ sections: [...] }}>
//     <MyDatabaseWidget />
//   </BlockHandle>
//
// Usage (standalone mode — position yourself):
//   <BlockHandle panelProps={{ sections: [...] }} standalone />
//
// The handle is a small grip icon (⠿) that fades in on hover.
// Click it to open the action panel. Drag it to move the element.
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlockHandleProps {
  children?: React.ReactNode;

  /** ActionPanel config shown when clicking the handle */
  panelProps?: Omit<ActionPanelProps, 'className'>;

  /** Render only the handle itself (no wrapper div). Useful when
   *  you want to position it manually inside another layout. */
  standalone?: boolean;

  /** Called when the user starts dragging the handle */
  onDragStart?: (e: React.DragEvent) => void;
  /** Called when the user stops dragging */
  onDragEnd?: (e: React.DragEvent) => void;
  /** Drag data to attach (e.g. element id) */
  dragData?: { type: string; payload: string };

  /** Extra CSS class on the outermost container (wrapper mode) */
  className?: string;
  /** Extra CSS class on the handle button itself */
  handleClassName?: string;
}

export function BlockHandle({
  children,
  panelProps,
  standalone = false,
  onDragStart,
  onDragEnd,
  dragData,
  className = '',
  handleClassName = '',
}: BlockHandleProps) {
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  /* Close panel on outside click */
  useEffect(() => {
    if (!showPanel) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        handleRef.current && !handleRef.current.contains(e.target as Node)
      ) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  const handleClick = useCallback(() => {
    if (panelProps) setShowPanel(prev => !prev);
  }, [panelProps]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (dragData) {
      e.dataTransfer.setData(dragData.type, dragData.payload);
    }
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e);
  }, [dragData, onDragStart]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    onDragEnd?.(e);
  }, [onDragEnd]);

  /* ─── The handle element ─────────────────────────────────────────────── */
  const handle = (
    <div className="relative flex items-start">
      <button
        ref={handleRef}
        onClick={handleClick}
        draggable={!!onDragStart || !!dragData}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`
          flex items-center justify-center
          w-[18px] h-6 rounded-[3px]
          text-ink-muted hover:text-hover-text
          hover:bg-hover-surface-soft4
          cursor-grab active:cursor-grabbing
          transition-colors
          ${handleClassName}
        `}
        title="Drag to move · Click for actions"
        aria-label="Block handle"
      >
        <GripHandleIcon className="w-[10px] h-[14px]" />
      </button>

      {/* Action panel — positioned to the right of the handle */}
      {showPanel && panelProps && (
        <div
          ref={panelRef}
          className="absolute z-50"
          style={{ top: 0, left: '100%', marginLeft: 4 }}
        >
          <ActionPanel {...panelProps} />
        </div>
      )}
    </div>
  );

  /* ─── Standalone: just the handle ────────────────────────────────────── */
  if (standalone) return handle;

  /* ─── Wrapper mode: wraps children with a hover container ────────────── */
  return (
    <div className={`relative group/block flex flex-col min-h-0 ${className}`}>
      {/* Handle floats to the left of the content, visible on hover */}
      <div
        className={`
          absolute top-0 z-10
          opacity-0 group-hover/block:opacity-100
          transition-opacity duration-150
          ${showPanel ? '!opacity-100' : ''}
        `}
        style={{ right: '100%', marginRight: 2 }}
      >
        {handle}
      </div>
      {children}
    </div>
  );
}
