/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableWidget.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:42 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:07:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { DashboardWidget, SchemaProperty } from '../../../../types/database';
import { formatCellValue } from '../constants';
import { cn } from '../../../../utils/cn';

export function renderTableWidget(
  widget: DashboardWidget, prop: SchemaProperty | null,
  pages: { id: string; icon?: string; properties: Record<string, unknown> }[],
  openPage: (id: string) => void, getPageTitle: (p: unknown) => string,
) {
  const tablePages = pages.slice(0, 20);
  return (
    <div className={cn("p-5 h-full flex flex-col")}>
      <h3 className={cn("text-sm font-semibold text-ink mb-3")}>{widget.title}</h3>
      <div className={cn("flex-1 overflow-auto")}>
        <table className={cn("w-full text-sm")}>
          <thead>
            <tr className={cn("border-b border-line")}>
              <th className={cn("text-left py-1.5 text-xs text-ink-secondary font-medium")}>Name</th>
              {prop && <th className={cn("text-right py-1.5 text-xs text-ink-secondary font-medium")}>{prop.name}</th>}
            </tr>
          </thead>
          <tbody>
            {tablePages.map(page => (
              <tr key={page.id} className={cn("border-b border-line-light hover:bg-hover-surface cursor-pointer")} onClick={() => openPage(page.id)}>
                <td className={cn("py-1.5 text-ink truncate max-w-[200px]")}>
                  {page.icon && <span className={cn("mr-1")}>{page.icon}</span>}
                  {getPageTitle(page) || 'Untitled'}
                </td>
                {prop && <td className={cn("py-1.5 text-right text-ink-body-light tabular-nums")}>{formatCellValue(page.properties[prop.id], prop)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
