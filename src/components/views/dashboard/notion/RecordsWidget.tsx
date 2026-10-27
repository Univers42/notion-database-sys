/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RecordsWidget.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// A records-presentation widget: the backing view's first records, sorted by
// one column (or by last edit), each a button that opens the record.

import React from 'react';
import { useViewPages } from '../../../../hooks/useViewPages';
import { useDatabaseStore } from '../../../../store/dbms/hardcoded/useDatabaseStore';
import type { ViewConfig, DashboardViewWidget } from '../../../../types/database';
import { formatCellValue } from '../constants';
import { cn } from '../../../../utils/cn';

/** Compact record list for a records-presentation widget. */
export function RecordsWidget({ widget, view }: Readonly<{ widget: DashboardViewWidget; view: ViewConfig | null }>) {
  const pages = useViewPages(widget.viewId);
  const getCellValue = useDatabaseStore(s => s.getCellValue);
  const getPageTitle = useDatabaseStore(s => s.getPageTitle);
  const openPage = useDatabaseStore(s => s.openPage);
  const databases = useDatabaseStore(s => s.databases);
  const database = view ? databases[view.databaseId] : undefined;
  const records = widget.records!;
  const sorted = React.useMemo(() => {
    const list = [...pages];
    list.sort((a, b) => {
      if (records.sortPropertyId) {
        const va = getCellValue(a, records.sortPropertyId);
        const vb = getCellValue(b, records.sortPropertyId);
        if (typeof va === 'number' && typeof vb === 'number') {
          return records.direction === 'asc' ? va - vb : vb - va;
        }
        const sa = String(va ?? '');
        const sb = String(vb ?? '');
        return records.direction === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      }
      return records.direction === 'asc'
        ? a.updatedAt.localeCompare(b.updatedAt)
        : b.updatedAt.localeCompare(a.updatedAt);
    });
    return list.slice(0, records.limit);
  }, [pages, records, getCellValue]);

  const showProp = records.showPropertyId && database ? database.properties[records.showPropertyId] : null;

  return (
    <div className={cn("flex-1 min-h-0 overflow-auto p-3")}>
      <div className={cn("flex flex-col gap-1")}>
        {sorted.map(page => (
          <button type="button" key={page.id} onClick={() => openPage(page.id)}
            className={cn("flex items-center justify-between py-1.5 px-2 hover:bg-hover-surface rounded-lg cursor-pointer text-left w-full")}>
            <span className={cn("text-sm text-ink truncate")}>{getPageTitle(page) || 'Untitled'}</span>
            {showProp && (
              <span className={cn("text-xs text-ink-muted tabular-nums shrink-0 ml-2")}>
                {formatCellValue(getCellValue(page, showProp.id), showProp)}
              </span>
            )}
          </button>
        ))}
        {sorted.length === 0 && <p className={cn("text-sm text-ink-muted py-4 text-center")}>No records</p>}
      </div>
    </div>
  );
}
