// ═══════════════════════════════════════════════════════════════════════════════
// InlineToolbar — floating formatting toolbar on text selection
// ═══════════════════════════════════════════════════════════════════════════════
// Appears above selected text in contentEditable blocks.
// Buttons: Bold | Italic | Strikethrough | Code | Link
// Uses document.execCommand for formatting and wraps with markdown syntax.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Strikethrough, Code, Link } from 'lucide-react';

// ─── Formatting actions ─────────────────────────────────────────────────────

interface FormatAction {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isActive?: () => boolean;
}

function wrapSelection(prefix: string, suffix: string): void {
  const sel = globalThis.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

  const range = sel.getRangeAt(0);
  const text = range.toString();
  if (!text) return;

  // Check if already wrapped — toggle off
  const editable = range.startContainer.parentElement?.closest('[contenteditable]');
  if (!editable) return;

  range.deleteContents();
  const wrapped = document.createTextNode(`${prefix}${text}${suffix}`);
  range.insertNode(wrapped);

  // Re-select the wrapped text
  const newRange = document.createRange();
  newRange.setStart(wrapped, prefix.length);
  newRange.setEnd(wrapped, prefix.length + text.length);
  sel.removeAllRanges();
  sel.addRange(newRange);

  // Dispatch input event so the block picks up changes
  editable.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertLinkMarkdown(): void {
  const sel = globalThis.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  const text = range.toString() || 'link text';
  const editable = range.startContainer.parentElement?.closest('[contenteditable]');
  if (!editable) return;

  const url = prompt('Enter URL:', 'https://');
  if (!url) return;

  range.deleteContents();
  const node = document.createTextNode(`[${text}](${url})`);
  range.insertNode(node);
  editable.dispatchEvent(new Event('input', { bubbles: true }));
}

// ─── Toolbar position calculation ───────────────────────────────────────────

interface ToolbarPosition {
  x: number;
  y: number;
  visible: boolean;
}

function getSelectionRect(): DOMRect | null {
  const sel = globalThis.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;

  // Only show in block editor contentEditable
  const anchorEl = sel.anchorNode?.parentElement;
  if (!anchorEl?.closest('[data-block-editor]')) return null;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

// ─── Toolbar button ─────────────────────────────────────────────────────────

function ToolbarButton({ icon, label, onClick, active }: Readonly<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}>) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={e => {
        e.preventDefault(); // keep selection
        onClick();
      }}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-accent text-ink-inverse'
          : 'text-ink-body-light hover:bg-hover-surface hover:text-ink-strong'
      }`}
    >
      {icon}
    </button>
  );
}

// ─── Color picker dropdown ──────────────────────────────────────────────────

const TEXT_COLORS = [
  { label: 'Default', value: '', className: 'bg-ink' },
  { label: 'Red', value: 'red', className: 'bg-red-500' },
  { label: 'Orange', value: 'orange', className: 'bg-orange-500' },
  { label: 'Yellow', value: 'yellow', className: 'bg-yellow-500' },
  { label: 'Green', value: 'green', className: 'bg-green-500' },
  { label: 'Blue', value: 'blue', className: 'bg-blue-500' },
  { label: 'Purple', value: 'purple', className: 'bg-purple-500' },
];

// ─── Main component ─────────────────────────────────────────────────────────

export function InlineToolbar() {
  const [pos, setPos] = useState<ToolbarPosition>({ x: 0, y: 0, visible: false });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const updatePosition = useCallback(() => {
    const rect = getSelectionRect();
    if (!rect) {
      // Delay hide slightly to avoid flicker during click
      hideTimeoutRef.current = setTimeout(() => {
        setPos(p => ({ ...p, visible: false }));
      }, 150);
      return;
    }
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      visible: true,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updatePosition);
    return () => {
      document.removeEventListener('selectionchange', updatePosition);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [updatePosition]);

  if (!pos.visible) return null;

  const toolbarWidth = 230;
  const left = Math.max(8, Math.min(pos.x - toolbarWidth / 2, window.innerWidth - toolbarWidth - 8));

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        left,
        top: pos.y,
        transform: 'translateY(-100%)',
        zIndex: 10000,
      }}
      className="flex items-center gap-0.5 px-1 py-0.5 bg-surface-primary border border-line rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <ToolbarButton
        icon={<Bold className="w-4 h-4" />}
        label="Bold (Ctrl+B)"
        onClick={() => wrapSelection('**', '**')}
      />
      <ToolbarButton
        icon={<Italic className="w-4 h-4" />}
        label="Italic (Ctrl+I)"
        onClick={() => wrapSelection('*', '*')}
      />
      <ToolbarButton
        icon={<Strikethrough className="w-4 h-4" />}
        label="Strikethrough"
        onClick={() => wrapSelection('~~', '~~')}
      />
      <ToolbarButton
        icon={<Code className="w-4 h-4" />}
        label="Inline code"
        onClick={() => wrapSelection('`', '`')}
      />

      <div className="w-px h-5 bg-line mx-0.5" />

      <ToolbarButton
        icon={<Link className="w-4 h-4" />}
        label="Link"
        onClick={insertLinkMarkdown}
      />
    </div>,
    document.body
  );
}
