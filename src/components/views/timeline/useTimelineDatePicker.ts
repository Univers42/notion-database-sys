/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useTimelineDatePicker.ts                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:14:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, parse,
  isSameDay, startOfWeek, endOfWeek,
  addMonths, isValid,
} from 'date-fns';
import type { TimelineDatePickerProps, DateFormatLabel, RemindOption } from './timelineDatePickerTypes';
import { DATE_FORMATS } from './timelineDatePickerTypes';


export function useTimelineDatePicker(props: Readonly<TimelineDatePickerProps>) {
  const {
    anchorRect, startDate, endDate, hasEndDate,
    onChangeStart, onChangeEnd, onToggleEndDate, onClose,
  } = props;

  const [currentMonth, setCurrentMonth] = useState(startDate ?? new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [dateFormat, setDateFormat] = useState<DateFormatLabel>('Full date');
  const [includeTime, setIncludeTime] = useState(false);
  const [remind, setRemind] = useState<RemindOption>('None');
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showRemindDropdown, setShowRemindDropdown] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const panelRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const style = useMemo(() => {
    const top = anchorRect.bottom + 4;
    const left = anchorRect.left;
    const maxLeft = window.innerWidth - 300;
    const maxTop = window.innerHeight - 520;
    return {
      top: Math.min(top, Math.max(8, maxTop)),
      left: Math.max(8, Math.min(left, maxLeft)),
    };
  }, [anchorRect]);

  useEffect(() => {
    const d = selectingEnd ? endDate : startDate;
    if (d) {
      setInputValue(format(d, 'MMM d, yyyy'));
    } else {
      setInputValue('');
    }
  }, [startDate, endDate, selectingEnd]);


  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFormatDropdown) setShowFormatDropdown(false);
        else if (showRemindDropdown) setShowRemindDropdown(false);
        else onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, showFormatDropdown, showRemindDropdown]);


  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });
  // Always show 6 weeks (42 cells) for consistent sizing
  const calDays = allDays.length < 42
    ? [
        ...allDays,
        ...eachDayOfInterval({
          start: addMonths(calEnd, 0),
          end: new Date(calEnd.getTime() + (42 - allDays.length) * 86400000),
        }).slice(1, 42 - allDays.length + 1),
      ]
    : allDays.slice(0, 42);

  const handleDayClick = useCallback(
    (day: Date) => {
      if (selectingEnd && hasEndDate) {
        onChangeEnd(day);
        setSelectingEnd(false);
      } else {
        onChangeStart(day);
        if (hasEndDate) setSelectingEnd(true);
      }
    },
    [selectingEnd, hasEndDate, onChangeStart, onChangeEnd],
  );

  const inRange = useCallback(
    (day: Date): boolean => {
      if (!hasEndDate || !startDate || !endDate) return false;
      return day > startDate && day < endDate;
    },
    [hasEndDate, startDate, endDate],
  );

  const isStart = useCallback(
    (day: Date): boolean => (startDate ? isSameDay(day, startDate) : false),
    [startDate],
  );

  const isEnd = useCallback(
    (day: Date): boolean =>
      hasEndDate && endDate ? isSameDay(day, endDate) : false,
    [hasEndDate, endDate],
  );


  const handleInputSubmit = useCallback(() => {
    if (!inputValue.trim()) return;
    const parsed = parse(inputValue, 'MMM d, yyyy', new Date());
    if (isValid(parsed)) {
      if (selectingEnd && hasEndDate) {
        onChangeEnd(parsed);
      } else {
        onChangeStart(parsed);
      }
      setCurrentMonth(parsed);
    }
  }, [inputValue, selectingEnd, hasEndDate, onChangeStart, onChangeEnd]);


  const handleToggleEnd = useCallback(() => {
    const next = !hasEndDate;
    onToggleEndDate(next);
    if (!next) onChangeEnd(null);
    setSelectingEnd(false);
  }, [hasEndDate, onToggleEndDate, onChangeEnd]);

  const activeFmt = DATE_FORMATS.find(f => f.label === dateFormat) ?? DATE_FORMATS[0];


  const _formatDate = useCallback(
    (d: Date | null): string => {
      if (!d) return '';
      if (activeFmt.fmt === 'relative') {
        const today = new Date();
        const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        if (diff === -1) return 'Yesterday';
        return format(d, 'MMM d, yyyy');
      }
      return format(d, activeFmt.fmt);
    },
    [activeFmt],
  );


  return {
    currentMonth, setCurrentMonth,
    selectingEnd,
    dateFormat, setDateFormat,
    includeTime, setIncludeTime,
    remind, setRemind,
    showFormatDropdown, setShowFormatDropdown,
    showRemindDropdown, setShowRemindDropdown,
    inputValue, setInputValue,
    panelRef, inputRef,
    style, calDays,
    handleDayClick, inRange, isStart, isEnd,
    handleInputSubmit, handleToggleEnd,
    activeFmt, _formatDate,
  };
}
