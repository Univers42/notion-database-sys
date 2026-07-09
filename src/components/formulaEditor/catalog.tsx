/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   catalog.tsx                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:29 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { cn } from '../../utils/cn';

// The function catalog data lives in the pure ./catalogData module so non-UI
// code (the "=" formula sugar) can reuse the same list; this file keeps only
// the JSX badge helper and re-exports the data for existing importers.
export { FORMULA_FUNCTIONS, FUNCTION_CATEGORIES, propReturnType } from './catalogData';
export type { FunctionDef } from './catalogData';

const RETURN_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'Number': { bg: 'bg-accent-muted', text: 'text-accent-text' },
  'Text': { bg: 'bg-success-surface-muted', text: 'text-success-text-bold' },
  'Boolean': { bg: 'bg-amber-surface-muted', text: 'text-amber-text-bold' },
  'Date': { bg: 'bg-purple-surface-muted', text: 'text-purple-text-bold' },
  'DateRange': { bg: 'bg-purple-surface-muted', text: 'text-purple-text-bold' },
  'List': { bg: 'bg-cyan-surface-muted', text: 'text-cyan-text-bold' },
  'Any': { bg: 'bg-surface-tertiary', text: 'text-ink-body-light' },
  'Person': { bg: 'bg-pink-surface-muted', text: 'text-pink-text-bold' },
};

/** Returns a styled badge element for a formula return type. */
export function getReturnTypeBadge(returnType: string) {
  const colors = RETURN_TYPE_COLORS[returnType] || RETURN_TYPE_COLORS['Any'];
  return (
    <span className={cn(`ml-2 shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors.bg} ${colors.text}`)}>
      {returnType}
    </span>
  );
}
