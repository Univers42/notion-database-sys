/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   timelineDatePickerTypes.ts                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:14:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export const DATE_FORMATS = [
  { label: 'Full date',  fmt: 'MMM d, yyyy' },
  { label: 'Month/Day/Year', fmt: 'MM/dd/yyyy' },
  { label: 'Day/Month/Year', fmt: 'dd/MM/yyyy' },
  { label: 'Year/Month/Day', fmt: 'yyyy/MM/dd' },
  { label: 'Relative',   fmt: 'relative' },
] as const;

export type DateFormatLabel = (typeof DATE_FORMATS)[number]['label'];

export const DEFAULT_DATE_FORMAT: DateFormatLabel = 'Full date';


export const REMIND_OPTIONS = [
  'None',
  'At time of event',
  '5 minutes before',
  '10 minutes before',
  '15 minutes before',
  '30 minutes before',
  '1 hour before',
  '2 hours before',
  '1 day before',
  '2 days before',
] as const;

export type RemindOption = (typeof REMIND_OPTIONS)[number];


export interface TimelineDatePickerProps {
  anchorRect: DOMRect;
  startDate: Date | null;
  endDate: Date | null;
  hasEndDate: boolean;
  onChangeStart: (d: Date) => void;
  onChangeEnd: (d: Date | null) => void;
  onToggleEndDate: (enabled: boolean) => void;
  onClear: () => void;
  onClose: () => void;
  /** Display/behaviour settings (persisted on the property when the callbacks
   *  are supplied; otherwise panel-local, the legacy behaviour). */
  dateFormat?: DateFormatLabel;
  includeTime?: boolean;
  remind?: RemindOption;
  onChangeDateFormat?: (v: DateFormatLabel) => void;
  onToggleIncludeTime?: (v: boolean) => void;
  onChangeRemind?: (v: RemindOption) => void;
}

/** Minutes-before-event for each remind option (0 = at the event, -1 = none). */
export const REMIND_OFFSET_MIN: Record<string, number> = {
  'None': -1,
  'At time of event': 0,
  '5 minutes before': 5,
  '10 minutes before': 10,
  '15 minutes before': 15,
  '30 minutes before': 30,
  '1 hour before': 60,
  '2 hours before': 120,
  '1 day before': 1440,
  '2 days before': 2880,
};

/**
 * Format an ISO date value per the property's chosen format + include-time.
 * Used by BOTH the table date cell and the timeline bar so the panel choice
 * actually changes what the user sees. Values stay plain ISO strings.
 */
export function formatDateValue(
  value: unknown,
  opts?: { format?: string; includeTime?: boolean },
): string | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(d.getTime())) return null;
  const entry = DATE_FORMATS.find(f => f.label === (opts?.format ?? DEFAULT_DATE_FORMAT)) ?? DATE_FORMATS[0];
  const base = formatWithPattern(d, entry.fmt);
  if (!opts?.includeTime) return base;
  return `${base} ${formatWithPattern(d, 'h:mm a')}`;
}

function formatWithPattern(d: Date, pattern: string): string {
  if (pattern === 'relative') {
    const diff = Math.round((d.getTime() - Date.now()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return isoFallback(d, 'MMM d, yyyy');
  }
  return isoFallback(d, pattern);
}

// Kept dependency-light: date-fns format is imported by callers; here we lean
// on the picker hook's date-fns import indirectly via a tiny manual formatter
// for the handful of patterns we support, so this module stays import-free.
function isoFallback(d: Date, pattern: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  switch (pattern) {
    case 'MMM d, yyyy': return `${months[d.getMonth()]} ${d.getDate()}, ${yyyy}`;
    case 'MM/dd/yyyy': return `${MM}/${dd}/${yyyy}`;
    case 'dd/MM/yyyy': return `${dd}/${MM}/${yyyy}`;
    case 'yyyy/MM/dd': return `${yyyy}/${MM}/${dd}`;
    case 'h:mm a': {
      const h = d.getHours();
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
    }
    default: return `${months[d.getMonth()]} ${d.getDate()}, ${yyyy}`;
  }
}
