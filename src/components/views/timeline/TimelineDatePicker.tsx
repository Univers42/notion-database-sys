/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineDatePicker.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 00:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 01:07:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, parse,
  isSameMonth, isSameDay, startOfWeek, endOfWeek,
  addMonths, subMonths, isToday as isTodayFn, isValid,
} from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, HelpCircle } from 'lucide-react';

/* ── Date format options ───────────────────────────────────────────────── */

const DATE_FORMATS = [
  { label: 'Full date',  fmt: 'MMMM d, yyyy' },
  { label: 'Month/Day/Year', fmt: 'MM/dd/yyyy' },
  { label: 'Day/Month/Year', fmt: 'dd/MM/yyyy' },
  { label: 'Year/Month/Day', fmt: 'yyyy/MM/dd' },
  { label: 'Relative',   fmt: 'relative' },
] as const;

type DateFormatLabel = (typeof DATE_FORMATS)[number]['label'];

/* ── Remind options ────────────────────────────────────────────────────── */

const REMIND_OPTIONS = [
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

type RemindOption = (typeof REMIND_OPTIONS)[number];

/* ── Props ─────────────────────────────────────────────────────────────── */

interface TimelineDatePickerProps {
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

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TimelineDatePicker                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

export function TimelineDatePicker({
  anchorRect,
  startDate,
  endDate,
  hasEndDate,
  onChangeStart,
  onChangeEnd,
  onToggleEndDate,
  onClear,
  onClose,
}: Readonly<TimelineDatePickerProps>) {
  const [currentMonth, setCurrentMonth] = useState(startDate ?? new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [dateFormat, setDateFormat] = useState<DateFormatLabel>('Full date');
  const [includeTime, setIncludeTime] = useState(false);
  const [remind, setRemind] = useState<RemindOption>('None');
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showRemindDropdown, setShowRemindDropdown] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Position panel below anchor, clamped to viewport ───────────────── */

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

  /* ── Sync input value with selected date ────────────────────────────── */

  useEffect(() => {
    const d = selectingEnd ? endDate : startDate;
    if (d) {
      setInputValue(format(d, 'MMM d, yyyy'));
    } else {
      setInputValue('');
    }
  }, [startDate, endDate, selectingEnd]);

  /* ── Close on Escape ────────────────────────────────────────────────── */

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

  /* ── Calendar grid ──────────────────────────────────────────────────── */

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

  /* ── Input submit handler ───────────────────────────────────────────── */

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

  /* ── Toggle callbacks ───────────────────────────────────────────────── */

  const handleToggleEnd = useCallback(() => {
    const next = !hasEndDate;
    onToggleEndDate(next);
    if (!next) onChangeEnd(null);
    setSelectingEnd(false);
  }, [hasEndDate, onToggleEndDate, onChangeEnd]);

  const activeFmt = DATE_FORMATS.find(f => f.label === dateFormat) ?? DATE_FORMATS[0];

  /* ── Format display for dates ───────────────────────────────────────── */

  const formatDate = useCallback(
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

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  Render                                                                 */
  /* ═══════════════════════════════════════════════════════════════════════ */

  return createPortal(
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-[9998] appearance-none border-0 bg-transparent cursor-default"
        onClick={() => {
          setShowFormatDropdown(false);
          setShowRemindDropdown(false);
          onClose();
        }}
        tabIndex={-1}
        aria-label="Close"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="fixed z-[9999] bg-surface-primary border border-line rounded-lg shadow-xl
                   flex flex-col overflow-visible"
        style={{ ...style, width: 280, minWidth: 180, maxWidth: 'calc(100vw - 24px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ════════════════════════════════════════════════════════════ */}
        {/*  Date input                                                 */}
        {/* ════════════════════════════════════════════════════════════ */}
        <div className="px-2 pt-2 pb-2 flex">
          <div
            className="flex items-center rounded-md h-7 leading-[1.2] px-2
                       flex-1 text-sm bg-surface-secondary/60
                       shadow-[inset_0_0_0_1px_var(--line)] focus-within:shadow-[inset_0_0_0_1px_var(--accent)]
                       transition-shadow"
          >
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent border-0 outline-none text-sm text-ink
                         placeholder:text-ink-muted"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleInputSubmit();
              }}
              onBlur={handleInputSubmit}
              placeholder={selectingEnd ? 'End date' : 'Start date'}
            />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  Calendar                                                    */}
        {/* ════════════════════════════════════════════════════════════ */}
        <div className="px-2 pb-1 text-center">
          {/* Caption: month label + Today + nav */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-ink" aria-live="polite" aria-atomic>
              {format(currentMonth, 'MMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date())}
                className="flex items-center justify-center rounded-[3px] h-5 px-2
                           text-[12px] font-medium text-ink-secondary
                           hover:bg-hover-surface2 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="flex items-center justify-center rounded-[3px] w-5 h-5
                           hover:bg-hover-surface2 transition-colors"
              >
                <ChevronLeft className="w-[11px] h-[17px] text-ink-muted" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="flex items-center justify-center rounded-[3px] w-5 h-5
                           hover:bg-hover-surface2 transition-colors"
              >
                <ChevronRight className="w-[11px] h-[17px] text-ink-muted" />
              </button>
            </div>
          </div>

          {/* Weekday headers (Mo–Su) */}
          <table className="w-full border-collapse" role="grid">
            <thead>
              <tr>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                  <th
                    key={d}
                    scope="col"
                    className="h-6 text-center text-[10px] font-medium text-ink-muted"
                  >
                    <span aria-hidden="true">{d}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, week) => (
                <tr key={week}>
                  {calDays.slice(week * 7, week * 7 + 7).map(day => {
                    const inMonth = isSameMonth(day, currentMonth);
                    const today = isTodayFn(day);
                    const start = isStart(day);
                    const end = isEnd(day);
                    const range = inRange(day);

                    /* Cell classes matching Notion's styles */
                    let btnCls = 'text-ink-body hover:bg-hover-surface2';
                    if (!inMonth) btnCls = 'text-ink-muted/50 hover:bg-hover-surface-soft';
                    if (range)
                      btnCls = 'bg-accent-soft/40 text-accent-text hover:bg-accent-soft';
                    if (start || end)
                      btnCls = 'bg-blue-500 text-white hover:bg-blue-600';

                    return (
                      <td key={day.toISOString()} className="p-0 relative">
                        <button
                          name="day"
                          type="button"
                          aria-label={format(day, 'do MMMM (EEEE)')}
                          aria-pressed={start || end || undefined}
                          tabIndex={start ? 0 : -1}
                          onClick={() => handleDayClick(day)}
                          className={`w-full h-8 flex items-center justify-center text-xs
                                      rounded-md transition-colors cursor-pointer
                                      ${btnCls}
                                      ${today && !start && !end ? 'font-bold' : ''}`}
                          style={
                            today && start
                              ? { backgroundColor: 'var(--accent, #2383e2)' }
                              : undefined
                          }
                        >
                          {format(day, 'd')}
                        </button>
                        {/* range overflow connector (between start/end) */}
                        {range && <div className="absolute inset-0 bg-accent-soft/20 pointer-events-none" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  Settings rows                                               */}
        {/* ════════════════════════════════════════════════════════════ */}

        {/* ── Divider ─────────────────────────────────────────────── */}
        <Divider />

        {/* ── End date toggle ─────────────────────────────────────── */}
        <OptionRow label="End date" onClick={handleToggleEnd}>
          <ToggleSwitch enabled={hasEndDate} />
        </OptionRow>

        {/* ── Date format dropdown ────────────────────────────────── */}
        <div className="relative">
          <OptionRow
            label="Date format"
            onClick={() => {
              setShowFormatDropdown(v => !v);
              setShowRemindDropdown(false);
            }}
          >
            <DropdownValue label={dateFormat} />
          </OptionRow>
          {showFormatDropdown && (
            <DropdownMenu
              items={DATE_FORMATS.map(f => f.label)}
              selected={dateFormat}
              onSelect={v => {
                setDateFormat(v as DateFormatLabel);
                setShowFormatDropdown(false);
              }}
              onClose={() => setShowFormatDropdown(false)}
            />
          )}
        </div>

        {/* ── Include time toggle ─────────────────────────────────── */}
        <OptionRow label="Include time" onClick={() => setIncludeTime(v => !v)}>
          <ToggleSwitch enabled={includeTime} />
        </OptionRow>

        {/* ── Remind dropdown ─────────────────────────────────────── */}
        <div className="relative">
          <OptionRow
            label="Remind"
            onClick={() => {
              setShowRemindDropdown(v => !v);
              setShowFormatDropdown(false);
            }}
          >
            <DropdownValue label={remind} />
          </OptionRow>
          {showRemindDropdown && (
            <DropdownMenu
              items={[...REMIND_OPTIONS]}
              selected={remind}
              onSelect={v => {
                setRemind(v as RemindOption);
                setShowRemindDropdown(false);
              }}
              onClose={() => setShowRemindDropdown(false)}
            />
          )}
        </div>

        {/* ── Divider ─────────────────────────────────────────────── */}
        <Divider />

        {/* ── Clear ───────────────────────────────────────────────── */}
        <OptionRow
          label="Clear"
          onClick={() => {
            onClear();
            onClose();
          }}
        />

        {/* ── Divider ─────────────────────────────────────────────── */}
        <Divider />

        {/* ── Learn about reminders ───────────────────────────────── */}
        <a
          href="https://www.notion.com/help/reminders"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-xs text-ink-secondary
                     hover:bg-hover-surface transition-colors no-underline"
        >
          <HelpCircle className="w-4 h-4 text-ink-muted shrink-0" />
          <span className="text-ink-secondary">Learn about reminders</span>
        </a>

        <footer className="w-full" />
      </div>
    </>,
    document.body,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Sub-components                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Horizontal divider between sections */
function Divider() {
  return <div className="h-px bg-line mx-0" />;
}

/** Toggle switch matching Notion's 14×26 switch */
function ToggleSwitch({ enabled }: Readonly<{ enabled: boolean }>) {
  return (
    <div className="flex items-center justify-center gap-1">
      <div
        className={`relative flex shrink-0 h-[14px] w-[26px] rounded-full p-[2px]
                    box-content transition-colors duration-200
                    ${enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <div
          className={`w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200 ease-out
                      ${enabled ? 'translate-x-[12px]' : 'translate-x-0'}`}
        />
      </div>
    </div>
  );
}

/** A settings row: label on left, controls on right */
function OptionRow({
  label,
  onClick,
  children,
}: Readonly<{
  label: string;
  onClick?: () => void;
  children?: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-[7px]
                 hover:bg-hover-surface transition-colors cursor-pointer text-left"
    >
      <span className="text-[13px] text-ink-body leading-tight">{label}</span>
      {children && <div className="flex items-center">{children}</div>}
    </button>
  );
}

/** Dropdown trigger value (text + chevron) */
function DropdownValue({ label }: Readonly<{ label: string }>) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[12px] text-ink-secondary">{label}</span>
      <ChevronDown className="w-3 h-3 text-ink-muted" />
    </div>
  );
}

/** A small absolute dropdown menu for format/remind pickers */
function DropdownMenu({
  items,
  selected,
  onSelect,
  onClose,
}: Readonly<{
  items: readonly string[] | string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}>) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[10000] appearance-none border-0 bg-transparent cursor-default"
        onClick={onClose}
        tabIndex={-1}
        aria-label="Close dropdown"
      />
      <div
        className="absolute right-2 top-full mt-1 z-[10001] bg-surface-primary border border-line
                   rounded-lg shadow-xl py-1 min-w-[140px] max-h-[200px] overflow-y-auto"
      >
        {items.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={`w-full text-left px-3 py-1.5 text-xs transition-colors
                        ${
                          item === selected
                            ? 'bg-accent-soft text-accent-text font-medium'
                            : 'text-ink-body hover:bg-hover-surface'
                        }`}
          >
            {item}
          </button>
        ))}
      </div>
    </>
  );
}
