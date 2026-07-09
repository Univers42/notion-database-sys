// ─── statusDefaults — Notion-parity seed for a fresh Status property ─────────
// A Status property is born usable: three groups (To-do / In Progress /
// Complete) each pre-wired to a default option — all renameable, recolorable,
// extendable afterwards. Ids derive from the property id: deterministic,
// collision-free per property, and testable without crypto.

import type { SchemaProperty } from '../../types/database';

/** Options + groups for a freshly created `status` property. */
export function defaultStatusSchema(
  propId: string,
): Pick<SchemaProperty, 'options' | 'statusGroups'> {
  const id = (suffix: string) => `${propId}-${suffix}`;
  return {
    options: [
      { id: id('not-started'), value: 'Not started', color: 'bg-surface-muted text-ink-strong' },
      { id: id('in-progress'), value: 'In progress', color: 'bg-accent-subtle text-accent-text-bold' },
      { id: id('done'), value: 'Done', color: 'bg-success-surface-medium text-success-text-tag' },
    ],
    statusGroups: [
      { id: id('sg-todo'), label: 'To-do', color: 'bg-surface-muted text-ink-strong', optionIds: [id('not-started')] },
      { id: id('sg-progress'), label: 'In Progress', color: 'bg-accent-subtle text-accent-text-bold', optionIds: [id('in-progress')] },
      { id: id('sg-complete'), label: 'Complete', color: 'bg-success-surface-medium text-success-text-tag', optionIds: [id('done')] },
    ],
  };
}

/** True when a property needs the status seed (became status with no options). */
export function needsStatusDefaults(property: Pick<SchemaProperty, 'type' | 'options'>): boolean {
  return property.type === 'status' && (property.options?.length ?? 0) === 0;
}
