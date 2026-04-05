/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineDatePicker.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 00:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 01:31:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { TimelineDatePickerProps, DateFormatLabel, RemindOption } from './timelineDatePickerTypes';
import { DATE_FORMATS, REMIND_OPTIONS } from './timelineDatePickerTypes';
import { useTimelineDatePicker } from './useTimelineDatePicker';
import { TimelineCalendarGrid } from './TimelineCalendarGrid';
import {
  Divider, TimelineToggleSwitch, OptionRow, DropdownValue, DropdownMenu,
} from './TimelineDatePickerWidgets';


/** Render a date-picker popover for editing timeline start/end dates, format, and reminders. */
export function TimelineDatePicker(props: Readonly<TimelineDatePickerProps>) {
  const {
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
  } = useTimelineDatePicker(props);

  const { hasEndDate, onClear, onClose } = props;

  return createPortal(
    <>
      {/* Backdrop */}
      <button
        type="button"
        className={cn("fixed inset-0 z-[9998] appearance-none border-0 bg-transparent cursor-default")}
        onClick={() => {
          setShowFormatDropdown(false);
          setShowRemindDropdown(false);
          onClose();
        }}
        tabIndex={-1}
        aria-label="Close"
      />

      {/* Panel */}
      <dialog // NOSONAR - dialog requires event handlers for propagation control
        open
        ref={panelRef}
        className={cn(`fixed z-[9999] bg-surface-primary border border-line rounded-lg shadow-xl
                   flex flex-col overflow-visible`)}
        style={{ ...style, width: 280, minWidth: 180, maxWidth: 'calc(100vw - 24px)' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <div className={cn("px-2 pt-2 pb-2 flex")}>
          <div
            className={cn(`flex items-center rounded-md h-7 leading-[1.2] px-2
                       flex-1 text-sm bg-surface-secondary/60
                       shadow-[inset_0_0_0_1px_var(--line)] focus-within:shadow-[inset_0_0_0_1px_var(--accent)]
                       transition-shadow`)}
          >
            <input
              ref={inputRef}
              type="text"
              className={cn(`w-full bg-transparent border-0 outline-none text-sm text-ink
                         placeholder:text-ink-muted`)}
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

        <TimelineCalendarGrid
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          calDays={calDays}
          onDayClick={handleDayClick}
          inRange={inRange}
          isStart={isStart}
          isEnd={isEnd}
        />

        <Divider />

        <OptionRow label="End date" onClick={handleToggleEnd}>
          <TimelineToggleSwitch enabled={hasEndDate} />
        </OptionRow>

        <div className={cn("relative")}>
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

        <OptionRow label="Include time" onClick={() => setIncludeTime(v => !v)}>
          <TimelineToggleSwitch enabled={includeTime} />
        </OptionRow>

        <div className={cn("relative")}>
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

        <Divider />

        <OptionRow
          label="Clear"
          onClick={() => {
            onClear();
            onClose();
          }}
        />

        <Divider />

        <a
          href="https://www.notion.com/help/reminders"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(`flex items-center gap-2 px-3 py-2 text-xs text-ink-secondary
                     hover:bg-hover-surface transition-colors no-underline`)}
        >
          <HelpCircle className={cn("w-4 h-4 text-ink-muted shrink-0")} />
          <span className={cn("text-ink-secondary")}>Learn about reminders</span>
        </a>

        <footer className={cn("w-full")} />
      </dialog>
    </>,
    document.body,
  );
}
