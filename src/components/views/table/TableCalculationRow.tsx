// ─── TableCalculationRow — sticky footer with a summary per column ───────────
// Each column picks a calculation (count, sum, earliest date, % checked…) over
// every row the view's filters keep, not only the rows loaded on screen. The
// choice is a view setting, so it persists and differs per view.

import React, { useMemo } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { Page, SchemaProperty } from '../../../types/database';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { semanticValue } from '../../../store/slices/cellValues';
import {
  activeCalculation, calculateColumn, calculationsFor, CALCULATION_LABELS, CALCULATION_SHORT,
  type ColumnCalculation,
} from './columnCalculation';
import { colWidthVar } from './useColumnResize';

interface TableCalculationRowProps {
  viewId: string;
  pages: readonly Page[];
  visibleProps: readonly SchemaProperty[];
  calculations: Readonly<Record<string, string>> | undefined;
  getColWidth: (propId: string) => number;
  showVerticalLines: boolean;
  showRowNumbers: boolean;
}

const ITEM = 'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer w-full text-left outline-none data-[highlighted]:bg-hover-surface';

/** Footer row: one Calculate menu per visible column. */
export function TableCalculationRow({
  viewId, pages, visibleProps, calculations, getColWidth, showVerticalLines, showRowNumbers,
}: Readonly<TableCalculationRowProps>) {
  const storeApi = useStoreApi();

  // Recomputed when the rows, the columns or a choice change; columns without
  // a calculation read no cell at all.
  const results = useMemo(() => {
    const state = storeApi.getState();
    const out = new Map<string, string>();
    for (const prop of visibleProps) {
      const fn = activeCalculation(prop, calculations?.[prop.id]);
      if (fn) out.set(prop.id, calculateColumn(fn, pages.map(page => semanticValue(state, page, prop))));
    }
    return out;
  }, [storeApi, pages, visibleProps, calculations]);

  const choose = (propId: string, fn: ColumnCalculation | null) => {
    const { [propId]: _previous, ...rest } = calculations ?? {};
    storeApi.getState().updateViewSettings(viewId, { columnCalculations: fn ? { ...rest, [propId]: fn } : rest });
  };

  return (
    <tfoot className={cn('sticky bottom-0 z-20')}>
      <tr className={cn('bg-surface-primary [&>td]:border-t [&>td]:border-line')}>
        {showRowNumbers && <td className={cn('w-10')} />}
        {visibleProps.map(prop => {
          const width = `var(${colWidthVar(prop.id)}, ${getColWidth(prop.id)}px)`;
          const fn = activeCalculation(prop, calculations?.[prop.id]);
          return (
            <td key={prop.id} style={{ width, minWidth: width, maxWidth: width }}
              className={cn(`p-0 group/calc ${showVerticalLines ? 'border-r' : ''} border-line`)}>
              <CalculationMenu prop={prop} active={fn} result={results.get(prop.id)} onChoose={next => choose(prop.id, next)} />
            </td>
          );
        })}
        <td colSpan={2} />
      </tr>
    </tfoot>
  );
}

interface CalculationMenuProps {
  prop: SchemaProperty;
  active: ColumnCalculation | null;
  result: string | undefined;
  onChoose: (fn: ColumnCalculation | null) => void;
}

function CalculationMenu({ prop, active, result, onChoose }: Readonly<CalculationMenuProps>) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button"
          aria-label={active ? `${prop.name}: ${CALCULATION_LABELS[active]} ${result ?? ''}. Change calculation` : `Calculate ${prop.name}`}
          className={cn('flex items-center justify-end gap-1.5 w-full h-8 px-3 text-xs text-ink-muted hover:bg-hover-surface2 outline-none focus-visible:ring-1 ring-ring-accent ring-inset transition-colors')}>
          {active ? (
            <>
              <span className={cn('uppercase tracking-wide text-[10px]')}>{CALCULATION_SHORT[active]}</span>
              <span className={cn('text-ink-body font-medium tabular-nums truncate')}>{result}</span>
            </>
          ) : (
            <span className={cn('flex items-center gap-1 opacity-0 group-hover/calc:opacity-100 group-focus-within/calc:opacity-100')}>
              Calculate <ChevronDown className={cn('w-3 h-3')} />
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" side="top" sideOffset={4} collisionPadding={8}
          className={cn('z-50 min-w-[180px] max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto bg-surface-primary rounded-lg p-1 shadow-xl border border-line text-sm')}>
          <MenuChoice label="None" checked={!active} onSelect={() => onChoose(null)} />
          <DropdownMenu.Separator className={cn('h-px bg-surface-tertiary my-1')} />
          {calculationsFor(prop).map(fn => (
            <MenuChoice key={fn} label={CALCULATION_LABELS[fn]} checked={fn === active} onSelect={() => onChoose(fn)} />
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuChoice({ label, checked, onSelect }: Readonly<{ label: string; checked: boolean; onSelect: () => void }>) {
  return (
    <DropdownMenu.CheckboxItem checked={checked} onSelect={onSelect} className={cn(ITEM)}>
      <span className={cn('w-4 shrink-0')}>
        <DropdownMenu.ItemIndicator><Check className={cn('w-4 h-4 text-accent')} /></DropdownMenu.ItemIndicator>
      </span>
      {label}
    </DropdownMenu.CheckboxItem>
  );
}
