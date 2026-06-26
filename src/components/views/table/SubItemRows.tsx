/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SubItemRows.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 08:15:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 08:15:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Renders a record row's sub-items as real, column-aligned table rows (Notion
 * "nested in toggle"): the title sits indented in the title column; a sub-item
 * that maps to a row already in the table's state (a real child record) fills the
 * other columns from that row, while a note shows only its title. A trailing
 * "New sub-item" row adds one. Pulls data/handlers from the sub-items context.
 */

import React from 'react';
import { CornerDownRight, Plus } from 'lucide-react';
import type { SchemaProperty } from '../../../types/database';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useSubItems } from './subItemsContext';
import { cn } from '../../../utils/cn';

interface SubItemRowsProps {
  recordId: string;
  visibleProps: SchemaProperty[];
  showRowNumbers: boolean;
  getColWidth: (propId: string) => number;
  titlePropId?: string;
  colCount: number;
}

function formatValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map((v) => (v == null ? '' : String(v))).filter(Boolean).join(', ');
  if (typeof value === 'object') return '';
  return String(value);
}

export function SubItemRows(props: Readonly<SubItemRowsProps>) {
  const { recordId, visibleProps, showRowNumbers, getColWidth, titlePropId, colCount } = props;
  const sub = useSubItems();
  const pages = useDatabaseStore((s) => s.pages);
  if (!sub) return null;

  const { rows, loading } = sub.rowsFor(recordId);
  // The indent/connector anchors on the title column when it's visible, else the
  // first visible column — so the nesting cue always shows (live mounts often
  // hide the title column). `titlePropId` is read for that preference.
  const preferredId = titlePropId ?? visibleProps.find((p) => p.type === 'title')?.id;
  const anchorId = (preferredId && visibleProps.some((p) => p.id === preferredId)) ? preferredId : visibleProps[0]?.id;
  const spanRest = colCount - (showRowNumbers ? 1 : 0);

  return (
    <>
      {loading && rows.length === 0 && (
        <tr>
          {showRowNumbers && <td className={cn("w-10 border-r border-b border-line bg-surface-secondary-soft2")} />}
          <td colSpan={spanRest} className={cn("border-b border-line bg-surface-secondary-soft2 py-1.5 pl-10 text-sm text-ink-muted")}>Loading sub-items…</td>
        </tr>
      )}
      {rows.map((row) => {
        const page = row.pageId ? pages[row.pageId] : undefined;
        return (
          <tr key={row.id} className={cn("group/sub cursor-pointer bg-surface-secondary-soft2 hover:bg-hover-surface-soft")} onClick={() => sub.open(row.id)}>
            {showRowNumbers && <td className={cn("w-10 border-r border-b border-line")} />}
            {visibleProps.map((prop) => {
              const w = getColWidth(prop.id);
              const style = { width: w, minWidth: w, maxWidth: w };
              const isAnchor = prop.id === anchorId;
              const pageVal = page ? formatValue(page.properties[prop.id]) : '';
              const text = isAnchor ? (pageVal || row.title || 'Untitled') : pageVal;
              return (
                <td key={prop.id} style={style} className={cn("overflow-hidden border-r border-b border-line px-3 py-1.5 align-middle")}>
                  <div className={cn("flex items-center gap-1.5 text-sm", isAnchor ? "pl-6 text-ink" : "text-ink-muted")}>
                    {isAnchor && <CornerDownRight className={cn("h-3 w-3 shrink-0 text-ink-muted")} />}
                    <span className={cn("truncate", isAnchor && "font-medium")}>{text}</span>
                  </div>
                </td>
              );
            })}
            <td className={cn("border-b border-line")} />
            <td className={cn("border-b border-line")} />
          </tr>
        );
      })}
      <tr className={cn("cursor-pointer hover:bg-hover-surface-accent3")} onClick={() => sub.create(recordId)}>
        {showRowNumbers && <td className={cn("w-10 border-r border-b border-line")} />}
        <td colSpan={spanRest} className={cn("border-b border-line py-1.5")}>
          <div className={cn("flex items-center gap-1.5 pl-9 text-sm text-ink-muted hover:text-hover-text")}>
            <Plus className={cn("h-3.5 w-3.5")} /> New sub-item
          </div>
        </td>
      </tr>
    </>
  );
}
