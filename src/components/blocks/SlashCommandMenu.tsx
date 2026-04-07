import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  SLASH_ITEMS,
  SECTION_LABELS,
  type SlashMenuItem,
} from "./slashMenu/slashMenuCatalog";
import { cn } from "../../utils/cn";

/** Props for {@link SlashCommandMenu}. */
export interface SlashCommandMenuProps {
  position: { x: number; y: number };
  filter: string;
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
}

/** Renders a filterable slash command menu for inserting new block types. */
export function SlashCommandMenu({
  position,
  filter,
  onSelect,
  onClose,
}: Readonly<SlashCommandMenuProps>) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!filter) return SLASH_ITEMS;
    const normalize = (value: string) =>
      value.toLowerCase().replaceAll(/[_-]+/g, " ").trim();
    const terms = normalize(filter).split(/\s+/).filter(Boolean);

    return SLASH_ITEMS.filter((item) => {
      const haystack = [item.label, item.type, ...(item.keywords ?? [])]
        .map(normalize)
        .join(" ");
      return terms.every((term) => haystack.includes(term));
    });
  }, [filter]);

  // Group by section
  const sections = useMemo(() => {
    const groups: Record<string, SlashMenuItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    }
    return groups;
  }, [filteredItems]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [filteredItems, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = scrollRef.current?.querySelector(
      `[data-slash-index="${selectedIndex}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Calculate position: show above if too close to bottom
  const menuHeight = 400;
  const showAbove = position.y + menuHeight > window.innerHeight;

  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(position.x, window.innerWidth - 340),
    ...(showAbove
      ? { bottom: window.innerHeight - position.y + 8 }
      : { top: position.y + 8 }),
    zIndex: 9999,
  };

  if (filteredItems.length === 0) {
    return createPortal(
      <div
        ref={menuRef}
        style={style}
        className={cn(
          "bg-surface-primary border border-line rounded-xl shadow-xl w-80",
        )}
      >
        <div className={cn("px-4 py-6 text-center text-sm text-ink-muted")}>
          No results
        </div>
      </div>,
      document.body,
    );
  }

  let flatIndex = 0;

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className={cn(
        "bg-surface-primary border border-line rounded-xl shadow-xl w-80 overflow-hidden",
      )}
    >
      <div
        ref={scrollRef}
        className={cn("overflow-y-auto")}
        style={{
          maxHeight: `min(448px, 40vh)`,
          maskImage:
            "linear-gradient(black 0%, black calc(100% - 34px), transparent 100%)",
        }}
      >
        {(["basic", "media", "layout", "advanced", "database"] as const).map(
          (sectionKey) => {
            const items = sections[sectionKey];
            if (!items || items.length === 0) return null;
            return (
              <div key={sectionKey} className={cn("py-1 px-1")}>
                <div
                  className={cn(
                    "px-2 pt-2 pb-1.5 text-xs font-medium text-ink-secondary select-none",
                  )}
                >
                  {SECTION_LABELS[sectionKey]}
                </div>
                {items.map((item) => {
                  const idx = flatIndex++;
                  return (
                    <button
                      key={`${item.type}-${item.label}`}
                      type="button"
                      data-slash-index={idx}
                      className={cn(
                        `w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left transition-colors ${
                          idx === selectedIndex
                            ? "bg-surface-tertiary"
                            : "hover:bg-hover-surface"
                        }`,
                      )}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => onSelect(item)}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 text-ink-body-light shrink-0 flex items-center justify-center",
                        )}
                      >
                        {item.icon}
                      </div>
                      <span className={cn("text-sm text-ink-strong flex-1")}>
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <span
                          className={cn("text-xs text-ink-muted font-mono")}
                        >
                          {item.shortcut}{" "}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          },
        )}
      </div>

      {/* Footer */}
      <div className={cn("border-t border-line px-1 py-1")}>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-hover-surface transition-colors",
          )}
        >
          <span className={cn("text-sm text-ink-body-light")}>Close menu</span>
          <span className={cn("text-xs text-ink-muted")}>esc</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
