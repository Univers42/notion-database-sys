import type { RollupFunction } from '../../types/database';

export const ROLLUP_FUNCTIONS: { value: RollupFunction; label: string; group: string }[] = [
  { value: 'show_original',       label: 'Show original',       group: 'Show' },
  { value: 'show_unique',         label: 'Show unique values',  group: 'Show' },
  { value: 'count_all',           label: 'Count all',           group: 'Count' },
  { value: 'count_values',        label: 'Count values',        group: 'Count' },
  { value: 'count_unique_values', label: 'Count unique values', group: 'Count' },
  { value: 'count_empty',         label: 'Count empty',         group: 'Count' },
  { value: 'count_not_empty',     label: 'Count not empty',     group: 'Count' },
  { value: 'percent_empty',       label: 'Percent empty',       group: 'Percent' },
  { value: 'percent_not_empty',   label: 'Percent not empty',   group: 'Percent' },
  { value: 'sum',                 label: 'Sum',                 group: 'Math' },
  { value: 'average',             label: 'Average',             group: 'Math' },
  { value: 'median',              label: 'Median',              group: 'Math' },
  { value: 'min',                 label: 'Min',                 group: 'Math' },
  { value: 'max',                 label: 'Max',                 group: 'Math' },
  { value: 'range',               label: 'Range',               group: 'Math' },
];

export type IdFormat = 'auto_increment' | 'prefixed' | 'uuid' | 'custom';

/** Map color tokens to Tailwind dot color classes */
export function getDotColor(optColor: string): string {
  if (optColor.includes('green')) return 'bg-success';
  if (optColor.includes('blue')) return 'bg-accent';
  if (optColor.includes('red')) return 'bg-danger';
  if (optColor.includes('yellow') || optColor.includes('amber') || optColor.includes('orange')) return 'bg-warning';
  if (optColor.includes('purple') || optColor.includes('violet')) return 'bg-purple';
  if (optColor.includes('pink')) return 'bg-pink';
  if (optColor.includes('cyan') || optColor.includes('teal')) return 'bg-cyan';
  return 'bg-surface-strong';
}
