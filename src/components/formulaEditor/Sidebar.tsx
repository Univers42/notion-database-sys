/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Sidebar.tsx                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:41 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import type { SchemaProperty } from '../../types/database';
import type { FunctionDef } from './catalog';
import { FUNCTION_CATEGORIES } from './catalog';
import { PropTypeIcon } from './PropTypeIcon';

interface SidebarProps {
  sidebarSearch: string;
  onSearchChange: (val: string) => void;
  filteredProperties: SchemaProperty[];
  filteredFunctions: FunctionDef[];
  expandedCategories: Set<string>;
  toggleCategory: (cat: string) => void;
  insertProperty: (prop: SchemaProperty) => void;
  insertFunction: (fn: FunctionDef) => void;
  onSelectItem: (item: { type: 'property'; prop: SchemaProperty } | { type: 'function'; fn: FunctionDef }) => void;
}

export function Sidebar({
  sidebarSearch, onSearchChange, filteredProperties, filteredFunctions,
  expandedCategories, toggleCategory, insertProperty, insertFunction, onSelectItem,
}: SidebarProps) {
  return (
    <div className="w-[240px] shrink-0 border-r border-line-light flex flex-col bg-surface-secondary-soft5">
      <div className="p-2 border-b border-line-light">
        <input value={sidebarSearch} onChange={e => onSearchChange(e.target.value)}
          className="w-full text-xs px-2.5 py-1.5 bg-surface-primary rounded-md border border-line outline-none focus:border-focus-border placeholder:text-placeholder transition-colors"
          placeholder="Search properties & functions…" />
      </div>
      <div className="flex-1 overflow-y-auto text-[13px]">
        {filteredProperties.length > 0 && (
          <CategorySection label="Properties" count={filteredProperties.length}
            expanded={expandedCategories.has('Properties')} onToggle={() => toggleCategory('Properties')}>
            {filteredProperties.map(prop => (
              <button key={prop.id} onClick={() => insertProperty(prop)}
                onMouseEnter={() => onSelectItem({ type: 'property', prop })}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-hover-surface-white hover:shadow-sm text-ink-body group transition-all">
                <PropTypeIcon type={prop.type} className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <span className="truncate text-left flex-1">{prop.name}</span>
                <ArrowUpRight className="w-3 h-3 text-ink-disabled opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
              </button>
            ))}
          </CategorySection>
        )}
        {FUNCTION_CATEGORIES.map(cat => {
          const fns = filteredFunctions.filter(f => f.category === cat);
          if (fns.length === 0) return null;
          return (
            <CategorySection key={cat} label={cat} count={fns.length}
              expanded={expandedCategories.has(cat)} onToggle={() => toggleCategory(cat)}>
              {fns.map(fn => (
                <button key={fn.name} onClick={() => insertFunction(fn)}
                  onMouseEnter={() => onSelectItem({ type: 'function', fn })}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-hover-surface-white hover:shadow-sm text-ink-body group transition-all">
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold text-ink-muted shrink-0 font-mono">ƒ</span>
                  <span className="truncate text-left flex-1 font-mono text-[12px]">
                    {fn.signature.includes('(') ? `${fn.name}()` : fn.name}
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-ink-disabled opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                </button>
              ))}
            </CategorySection>
          );
        })}
      </div>
    </div>
  );
}

function CategorySection({ label, count, expanded, onToggle, children }: {
  label: string; count: number; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <button onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider hover:text-hover-text transition-colors">
        <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
        {label}
        <span className="text-[10px] font-normal tabular-nums ml-auto">{count}</span>
      </button>
      {expanded && <div className="px-1">{children}</div>}
    </div>
  );
}
