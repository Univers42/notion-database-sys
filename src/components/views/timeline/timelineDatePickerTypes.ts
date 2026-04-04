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
  { label: 'Full date',  fmt: 'MMMM d, yyyy' },
  { label: 'Month/Day/Year', fmt: 'MM/dd/yyyy' },
  { label: 'Day/Month/Year', fmt: 'dd/MM/yyyy' },
  { label: 'Year/Month/Day', fmt: 'yyyy/MM/dd' },
  { label: 'Relative',   fmt: 'relative' },
] as const;

export type DateFormatLabel = (typeof DATE_FORMATS)[number]['label'];


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
}
