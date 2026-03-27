import React, { useState, useRef, useEffect } from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { X, ExternalLink, Hash, ArrowLeftRight, ChevronRight, Database as DbIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// RELATION EDITOR PANEL — Configure a relation property
// ═══════════════════════════════════════════════════════════════════════════════
// Notion-matching panel:
//   • Property name input
//   • "Related to" → pick a target database
//   • "Limit" → no limit / 1
//   • "Two-way relation" toggle
//   • "Add relation" / "Save" button
// ═══════════════════════════════════════════════════════════════════════════════

interface RelationEditorPanelProps {
  databaseId: string;
  propertyId: string;
  onClose: () => void;
  position?: { top: number; left: number };
}

export function RelationEditorPanel({ databaseId, propertyId, onClose, position }: RelationEditorPanelProps) {
  const { databases, updateProperty } = useDatabaseStore();
  const db = databases[databaseId];
  const prop = db?.properties[propertyId];

  const [name, setName] = useState(prop?.name || 'New relation');
  const [targetDbId, setTargetDbId] = useState(prop?.relationConfig?.databaseId || '');
  const [twoWay, setTwoWay] = useState(prop?.relationConfig?.type === 'two_way');
  const [limit, setLimit] = useState<number | undefined>(prop?.relationConfig?.limit);
  const [showDbPicker, setShowDbPicker] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const otherDbs = Object.values(databases).filter(d => d.id !== databaseId);
  const selectedDb = databases[targetDbId];

  const handleSave = () => {
    if (!targetDbId) return;
    updateProperty(databaseId, propertyId, {
      name: name.trim() || 'Relation',
      type: 'relation',
      relationConfig: {
        databaseId: targetDbId,
        type: twoWay ? 'two_way' : 'one_way',
        limit,
      },
    });
    onClose();
  };

  const style: React.CSSProperties = position
    ? { position: 'fixed', top: Math.min(position.top, window.innerHeight - 440), left: Math.min(position.left, window.innerWidth - 310), zIndex: 70 }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 70 };

  return (
    <div ref={panelRef} style={style}
      className="w-[290px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[80vh]">

      {/* Header */}
      <div className="flex items-center px-4 pt-3 pb-1.5 shrink-0">
        <span className="flex-1 font-semibold text-sm text-gray-900 truncate">
          {prop?.relationConfig ? 'Edit relation' : 'New relation'}
        </span>
        <button onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {/* Property name */}
        <div className="py-2">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Property name"
            className="w-full text-sm px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50/50 outline-none focus:border-blue-400 focus:bg-white transition-colors" />
        </div>

        {/* Related to (database picker) */}
        <div className="py-1">
          <button onClick={() => setShowDbPicker(!showDbPicker)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-gray-50 text-sm transition-colors">
            <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="flex-1 text-left text-gray-700">Related to</span>
            <span className="flex items-center gap-1 text-gray-400 text-xs shrink-0 max-w-[120px]">
              {selectedDb ? (
                <>
                  {selectedDb.icon && <span>{selectedDb.icon}</span>}
                  <span className="truncate">{selectedDb.name}</span>
                </>
              ) : 'Select...'}
              <ChevronRight className="w-3 h-3 shrink-0" />
            </span>
          </button>

          {showDbPicker && (
            <div className="ml-6 mt-1 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
              {otherDbs.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400">No other databases</div>
              ) : otherDbs.map(d => (
                <button key={d.id}
                  onClick={() => { setTargetDbId(d.id); setShowDbPicker(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white transition-colors ${d.id === targetDbId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
                  {d.icon ? <span className="text-base">{d.icon}</span> : <DbIcon className="w-4 h-4 text-gray-400" />}
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
              {/* self-relation */}
              <button
                onClick={() => { setTargetDbId(databaseId); setShowDbPicker(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white transition-colors border-t border-gray-100 ${databaseId === targetDbId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
                {db?.icon ? <span className="text-base">{db.icon}</span> : <DbIcon className="w-4 h-4 text-gray-400" />}
                <span className="truncate">{db?.name} (self)</span>
              </button>
            </div>
          )}
        </div>

        {/* Limit */}
        <div className="py-1">
          <button onClick={() => setLimit(limit === 1 ? undefined : 1)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-gray-50 text-sm transition-colors">
            <Hash className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="flex-1 text-left text-gray-700">Limit</span>
            <span className="text-xs text-gray-400">{limit === 1 ? '1 page' : 'No limit'}</span>
            <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
          </button>
        </div>

        {/* Two-way toggle */}
        <div className="flex items-center gap-2 px-2.5 py-2">
          <ArrowLeftRight className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="flex-1 text-sm text-gray-700">Two-way relation</span>
          <button onClick={() => setTwoWay(!twoWay)}
            className={`relative w-8 h-[18px] rounded-full transition-colors ${twoWay ? 'bg-blue-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${twoWay ? 'translate-x-[16px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Add / Save button */}
      <div className="px-4 pb-3 pt-1 shrink-0">
        <button onClick={handleSave} disabled={!targetDbId}
          className={`w-full py-2 rounded-md text-sm font-medium transition-colors ${targetDbId
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}>
          {prop?.relationConfig ? 'Save' : 'Add relation'}
        </button>
      </div>
    </div>
  );
}
