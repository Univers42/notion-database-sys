/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableLoadMoreRow.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface TableLoadMoreRowProps {
  colCount: number;
  shown: number;
  total: number;
  onLoadMore: () => void;
  onShowAll: () => void;
  /** Group footers sit under an indented group body. */
  indented?: boolean;
  /** Virtualizer index + measure ref, when the row sits in a windowed body. */
  index?: number;
  measureRow?: (el: HTMLTableRowElement | null) => void;
}

/** Footer row under a capped table body: append the next rows in place, or
 *  lift the limit entirely for this session. */
export function TableLoadMoreRow({ colCount, shown, total, onLoadMore, onShowAll, indented, index, measureRow }: Readonly<TableLoadMoreRowProps>) {
  const action = 'text-sm text-accent-text-soft hover:text-hover-accent-text-bold hover:bg-hover-surface-accent2 transition-colors';
  return (
    <tr ref={measureRow} data-index={index} role="row">
      <td role="gridcell" colSpan={colCount} className={cn('p-0 border-b border-line')}>
        <div className={cn(`flex items-stretch ${indented ? 'pl-4' : ''}`)}>
          <button type="button" onClick={onLoadMore}
            className={cn(`flex-1 text-left px-4 py-2 flex items-center gap-2 ${action}`)}>
            <ChevronDown className={cn('w-4 h-4')} />Load more
          </button>
          <button type="button" onClick={onShowAll} aria-label={`Show all ${total} rows`}
            className={cn(`px-3 py-2 ${action}`)}>
            Show all
          </button>
          <span className={cn('px-4 py-2 text-xs text-ink-muted tabular-nums self-center')}>{shown} of {total}</span>
        </div>
      </td>
    </tr>
  );
}
