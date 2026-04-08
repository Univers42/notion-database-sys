import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { PanelSection } from '../ui/ActionPanel';
import { ActionPanel } from '../ui/ActionPanel';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { clampPanelPosition, Z } from '../../utils/geometry';

export interface BlockContextMenuState {
  blockId: string;
  x: number;
  y: number;
}

interface BlockContextMenuProps {
  menu: BlockContextMenuState | null;
  sections: PanelSection[];
  onClose: () => void;
  width?: number;
}

export function BlockContextMenu({
  menu,
  sections,
  onClose,
  width = 260,
}: Readonly<BlockContextMenuProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const active = !!menu;

  useOutsideClick(ref, active, onClose);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onClose]);

  const position = useMemo(() => {
    if (!menu) return null;
    return clampPanelPosition(menu.y, menu.x, 520, width);
  }, [menu, width]);

  if (!menu || !position || sections.length === 0) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 appearance-none border-0 bg-transparent p-0 cursor-default"
        style={{ zIndex: Z.DROPDOWN }}
        onClick={onClose}
        tabIndex={-1}
        aria-label="Close block context menu"
      />
      <div
        ref={ref}
        className="fixed"
        style={{
          top: position.top,
          left: position.left,
          zIndex: Z.DROPDOWN + 1,
        }}
      >
        <ActionPanel sections={sections} width={width} />
      </div>
    </>,
    document.body,
  );
}
