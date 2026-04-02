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

export function renderTableWidget(
  widget: DashboardWidget, prop: SchemaProperty | null,
  pages: { id: string; icon?: string; properties: Record<string, unknown> }[],
  openPage: (id: string) => void, getPageTitle: (p: unknown) => string,
) {
  const tablePages = pages.slice(0, 20);
  return (
    <div className="p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-ink mb-3">{widget.title}</h3>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left py-1.5 text-xs text-ink-secondary font-medium">Name</th>
              {prop && <th className="text-right py-1.5 text-xs text-ink-secondary font-medium">{prop.name}</th>}
            </tr>
          </thead>
          <tbody>
            {tablePages.map(page => (
              <tr key={page.id} className="border-b border-line-light hover:bg-hover-surface cursor-pointer" onClick={() => openPage(page.id)}>
                <td className="py-1.5 text-ink truncate max-w-[200px]">
                  {page.icon && <span className="mr-1">{page.icon}</span>}
                  {getPageTitle(page) || 'Untitled'}
                </td>
                {prop && <td className="py-1.5 text-right text-ink-body-light tabular-nums">{formatCellValue(page.properties[prop.id], prop)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
