import React from 'react';
import { cn } from '../../utils/cn';

/** Describes a formatting action available in the inline toolbar. */
export interface FormatAction {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isActive?: () => boolean;
}

/** Wraps the current text selection with prefix/suffix (toggles off if already wrapped). */
export function wrapSelection(prefix: string, suffix: string): void {
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

/** Inserts a Markdown link template at the current selection. */
export function insertLinkMarkdown(): void {
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

/** Position and visibility state for the floating inline toolbar. */
export interface ToolbarPosition {
  x: number;
  y: number;
  visible: boolean;
}

/** Returns the bounding rect of the current selection within a contenteditable, or null. */
export function getSelectionRect(): DOMRect | null {
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

/** Renders a single button in the inline formatting toolbar. */
export function ToolbarButton({ icon, label, onClick, active }: Readonly<{
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
      className={cn(`p-1.5 rounded transition-colors ${
        active
          ? 'bg-accent text-ink-inverse'
          : 'text-ink-body-light hover:bg-hover-surface hover:text-ink-strong'
      }`)}
    >
      {icon}
    </button>
  );
}

/** Available text color options for the inline color picker. */
export const TEXT_COLORS = [
  { label: 'Default', value: '', className: 'bg-ink' },
  { label: 'Red', value: 'red', className: 'bg-red-500' },
  { label: 'Orange', value: 'orange', className: 'bg-orange-500' },
  { label: 'Yellow', value: 'yellow', className: 'bg-yellow-500' },
  { label: 'Green', value: 'green', className: 'bg-green-500' },
  { label: 'Blue', value: 'blue', className: 'bg-blue-500' },
  { label: 'Purple', value: 'purple', className: 'bg-purple-500' },
];
