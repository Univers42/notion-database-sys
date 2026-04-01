import React from 'react';
import { Plus, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import type { SchemaProperty } from '../../types/database';

export function SortPanel({ database, view }: { database: any; view: any }) {
  const { addSort, updateSort, removeSort, clearSorts } = useDatabaseStore.getState();
  const allProps = Object.values(database.properties) as SchemaProperty[];
  const sorts = view.sorts || [];

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-ink-body">Sorts</span>
        {sorts.length > 0 && (
          <button onClick={() => clearSorts(view.id)} className="text-xs text-danger-text-soft hover:text-hover-danger-text-bold">Clear all</button>
        )}
      </div>
      {sorts.map((sort: any) => (
        <div key={sort.id} className="flex items-center gap-2 text-sm">
          <select value={sort.propertyId}
            onChange={e => updateSort(view.id, sort.id, { propertyId: e.target.value })}
            className="px-2 py-1.5 border border-line rounded-lg bg-surface-primary text-sm flex-1">
            {allProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => updateSort(view.id, sort.id, { direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 border border-line rounded-lg text-sm transition-colors hover:bg-hover-surface ${
              sort.direction === 'asc' ? 'text-accent-text-light' : 'text-purple-text'
            }`}>
            {sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {sort.direction === 'asc' ? 'Ascending' : 'Descending'}
          </button>
          <button onClick={() => removeSort(view.id, sort.id)}
            className="p-1 text-ink-muted hover:text-hover-danger-text rounded hover:bg-hover-surface transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button onClick={() => { const firstProp = allProps[0]; if (firstProp) addSort(view.id, { propertyId: firstProp.id, direction: 'asc' }); }}
        className="flex items-center gap-1.5 text-sm text-accent-text-soft hover:text-hover-accent-text py-1 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add sort
      </button>
    </div>
  );
}
