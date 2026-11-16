/* ************************************************************************** */
/*  requestedDatabase.ts — the database a surface asks for always has a view.  */
/*  The Databases panel opens a viewless database as `<id>-table`; without a  */
/*  view the block dead-ends on "No database" (Probe2, 85 rows, 2026-11-16).  */
/* ************************************************************************** */

import type { NotionState } from '../component/types';

type View = NotionState['views'][string];

/** `loaded` plus whatever the requested database needs to render: an unknown id is
 *  materialized fresh; a known one with no view of its own gets a Table view. */
export function withRequestedDatabase(
  loaded: NotionState,
  databaseId?: string,
  initialView?: string | null,
  databaseName?: string,
): NotionState {
  if (!databaseId) return loaded;
  const known = loaded.databases[databaseId];
  if (known) {
    if (Object.values(loaded.views).some((view) => view.databaseId === databaseId)) return loaded;
    const viewId = initialView || `${databaseId}-table`;
    const columns = Object.keys(known.properties ?? {}).sort((a, b) =>
      Number(b === known.titlePropertyId) - Number(a === known.titlePropertyId));
    return { ...loaded, views: { ...loaded.views, [viewId]: createEmptyView(viewId, databaseId, 'Table', 'table', columns) } };
  }
  const emptyState = createEmptyDatabaseState(databaseId, initialView, databaseName);
  return {
    databases: { ...loaded.databases, ...emptyState.databases },
    // Include the starter row — dropping emptyState.pages ships a rowless table.
    pages: { ...loaded.pages, ...emptyState.pages },
    views: { ...loaded.views, ...emptyState.views },
  };
}

/** Notion parity: a fresh database ships ONLY the mandatory title column, a
 *  single Table view, and one empty starter row ready to type into. */
function createEmptyDatabaseState(databaseId: string, initialView?: string | null, databaseName?: string): NotionState {
  const titlePropertyId = `${databaseId}-title`;
  const tableViewId = initialView || `${databaseId}-table`;
  const starterPageId = `${databaseId}-row-1`;
  const now = new Date().toISOString();

  return {
    databases: {
      [databaseId]: {
        id: databaseId,
        name: databaseName || 'Untitled database',
        icon: '📋',
        titlePropertyId,
        properties: {
          [titlePropertyId]: { id: titlePropertyId, name: 'Name', type: 'title' },
        },
      },
    },
    pages: {
      [starterPageId]: {
        id: starterPageId, databaseId,
        properties: { [titlePropertyId]: '' }, content: [],
        createdAt: now, updatedAt: now, createdBy: 'You', lastEditedBy: 'You',
      },
    },
    views: {
      [tableViewId]: createEmptyView(tableViewId, databaseId, 'Table', 'table', [titlePropertyId]),
    },
  };
}

function createEmptyView(id: string, databaseId: string, name: string, type: View['type'], visibleProperties: string[]): View {
  return { id, databaseId, name, type, filters: [], filterConjunction: 'and', sorts: [], visibleProperties, settings: {} };
}
