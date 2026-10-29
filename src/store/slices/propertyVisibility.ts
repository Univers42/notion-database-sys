import type { ViewConfig } from '../../types/database';

/** Where a new column lands in the view it was created from: after `after`, first when
 *  `after` is null, last when `after` is not shown in that view. */
export interface PropertyPlacement {
  viewId: string;
  after: string | null;
}

/** A new property shows in every view of its database, not only the one it was added from.
 *  It used to join the active view alone, so each other view hid it until someone found it
 *  under "Properties" and switched it on. */
export function showNewProperty(
  views: Record<string, ViewConfig>,
  databaseId: string,
  propertyId: string,
  placement?: PropertyPlacement,
): Record<string, ViewConfig> {
  const next = { ...views };
  for (const [viewId, view] of Object.entries(views)) {
    if (view.databaseId !== databaseId || view.visibleProperties.includes(propertyId)) continue;
    const visible = [...view.visibleProperties];
    const anchor = placement?.viewId === viewId ? placement.after : undefined;
    if (anchor === null) visible.unshift(propertyId);
    else {
      const index = anchor === undefined ? -1 : visible.indexOf(anchor);
      visible.splice(index === -1 ? visible.length : index + 1, 0, propertyId);
    }
    next[viewId] = { ...view, visibleProperties: visible };
  }
  return next;
}
