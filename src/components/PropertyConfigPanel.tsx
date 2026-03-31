import React, { useState, useRef, useEffect } from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { PropertyType, SchemaProperty } from '../types/database';
import { IconPickerPopover } from './ui/IconPicker';
import { Icon } from './ui/Icon';
import { FormulaEditorPanel } from './FormulaEditorPanel';
import { RelationEditorPanel } from './RelationEditorPanel';
import { RollupEditorPanel } from './RollupEditorPanel';
import {
  Type, Hash, Calendar, CheckSquare, User, Link, Mail, Phone, Tag, List,
  Clock, ArrowUp, ArrowDown, Filter, Group, Calculator, EyeOff, PanelLeftClose,
  PanelRightClose, Trash2, X, ChevronRight, Smile, CircleDot, MapPin,
  FileText, MousePointerClick, Fingerprint, Users, Sigma, GitBranch, ExternalLink
} from 'lucide-react';

const DEFAULT_PROPERTY_ICONS: Record<string, string> = {
  title: 'document', text: 'pencil-square-outline', number: '123',
  select: 'check', multi_select: 'checkmark-list', status: 'activity-rectangle',
  date: 'calendar', checkbox: 'checkmark-square', person: 'vitruvian-man-circle',
  user: 'vitruvian-man-circle', url: 'arrow-northeast', email: 'exclamation-speech-bubble',
  phone: 'bell', files_media: 'paperclip', relation: 'arrows-swap-horizontal',
  formula: 'angle-brackets-solidus', rollup: 'chart-pie', button: 'cursor-click',
  place: 'compass', id: 'identification-badge', created_time: 'clock',
  last_edited_time: 'clock-outline', created_by: 'user-speech-bubble', last_edited_by: 'user-speech-bubble',
  assigned_to: 'vitruvian-man-circle', due_date: 'calendar', custom: 'identification-badge',
};

const TYPE_OPTIONS: { type: PropertyType; label: string; icon: React.ReactNode; group: string }[] = [
  { type: 'text', label: 'Text', icon: <Type className="w-4 h-4" />, group: 'Basic' },
  { type: 'number', label: 'Number', icon: <Hash className="w-4 h-4" />, group: 'Basic' },
  { type: 'select', label: 'Select', icon: <List className="w-4 h-4" />, group: 'Basic' },
  { type: 'multi_select', label: 'Multi-select', icon: <Tag className="w-4 h-4" />, group: 'Basic' },
  { type: 'status', label: 'Status', icon: <CircleDot className="w-4 h-4" />, group: 'Basic' },
  { type: 'date', label: 'Date', icon: <Calendar className="w-4 h-4" />, group: 'Basic' },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-4 h-4" />, group: 'Basic' },
  { type: 'person', label: 'Person', icon: <Users className="w-4 h-4" />, group: 'Advanced' },
  { type: 'url', label: 'URL', icon: <Link className="w-4 h-4" />, group: 'Advanced' },
  { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, group: 'Advanced' },
  { type: 'phone', label: 'Phone', icon: <Phone className="w-4 h-4" />, group: 'Advanced' },
  { type: 'files_media', label: 'Files & media', icon: <FileText className="w-4 h-4" />, group: 'Advanced' },
  { type: 'place', label: 'Location', icon: <MapPin className="w-4 h-4" />, group: 'Advanced' },
  { type: 'id', label: 'ID', icon: <Fingerprint className="w-4 h-4" />, group: 'Advanced' },
  { type: 'relation', label: 'Relation', icon: <ChevronRight className="w-4 h-4" />, group: 'Relation' },
  { type: 'rollup', label: 'Rollup', icon: <Calculator className="w-4 h-4" />, group: 'Relation' },
  { type: 'formula', label: 'Formula', icon: <Hash className="w-4 h-4" />, group: 'Relation' },
  { type: 'button', label: 'Button', icon: <MousePointerClick className="w-4 h-4" />, group: 'Action' },
  { type: 'created_time', label: 'Created time', icon: <Clock className="w-4 h-4" />, group: 'Auto' },
  { type: 'last_edited_time', label: 'Last edited time', icon: <Clock className="w-4 h-4" />, group: 'Auto' },
  { type: 'created_by', label: 'Created by', icon: <User className="w-4 h-4" />, group: 'Auto' },
  { type: 'last_edited_by', label: 'Last edited by', icon: <User className="w-4 h-4" />, group: 'Auto' },
  { type: 'assigned_to', label: 'Assigned to', icon: <Users className="w-4 h-4" />, group: 'Advanced' },
  { type: 'due_date', label: 'Due date', icon: <Calendar className="w-4 h-4" />, group: 'Advanced' },
  { type: 'custom', label: 'Custom', icon: <Hash className="w-4 h-4" />, group: 'Advanced' },
];

function getPropIcon(type: string, className = 'w-4 h-4') {
  switch (type) {
    case 'title': case 'text': return <Type className={className} />;
    case 'number': return <Hash className={className} />;
    case 'select': return <List className={className} />;
    case 'multi_select': return <Tag className={className} />;
    case 'status': return <CircleDot className={className} />;
    case 'date': return <Calendar className={className} />;
    case 'checkbox': return <CheckSquare className={className} />;
    case 'person': case 'user': return <Users className={className} />;
    case 'email': return <Mail className={className} />;
    case 'phone': return <Phone className={className} />;
    case 'url': return <Link className={className} />;
    case 'files_media': return <FileText className={className} />;
    case 'place': return <MapPin className={className} />;
    case 'id': return <Fingerprint className={className} />;
    case 'button': return <MousePointerClick className={className} />;
    case 'relation': return <ChevronRight className={className} />;
    case 'formula': case 'rollup': return <Calculator className={className} />;
    case 'created_time': case 'last_edited_time': return <Clock className={className} />;
    case 'created_by': case 'last_edited_by': return <User className={className} />;
    case 'assigned_to': return <Users className={className} />;
    case 'due_date': return <Calendar className={className} />;
    case 'custom': return <Hash className={className} />;
    default: return <Type className={className} />;
  }
}

interface PropertyConfigPanelProps {
  property: SchemaProperty;
  databaseId: string;
  viewId: string;
  position: { top: number; left: number };
  onClose: () => void;
}

export function PropertyConfigPanel({ property, databaseId, viewId, position, onClose }: PropertyConfigPanelProps) {
  const {
    updateProperty, deleteProperty, togglePropertyVisibility,
    addSort, addFilter, setGrouping, insertPropertyAt, views,
    updatePageProperty, pages,
  } = useDatabaseStore();

  const [propName, setPropName] = useState(property.name);
  const [showTypeList, setShowTypeList] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [showRelationEditor, setShowRelationEditor] = useState(false);
  const [showRollupEditor, setShowRollupEditor] = useState(false);
  const [showIdConfig, setShowIdConfig] = useState(false);
  const [idPrefix, setIdPrefix] = useState(property.prefix || '');
  const [idFormat, setIdFormat] = useState<'auto_increment' | 'prefixed' | 'uuid'>(() => {
    if (property.prefix === 'uuid') return 'uuid';
    if (property.prefix && property.prefix !== 'uuid') return 'prefixed';
    return 'auto_increment';
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.select();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const commitName = () => {
    if (propName.trim() && propName.trim() !== property.name) {
      updateProperty(databaseId, property.id, { name: propName.trim() });
    }
  };

  const changeType = (newType: PropertyType) => {
    if (newType !== property.type) {
      updateProperty(databaseId, property.id, { type: newType });
    }
    setShowTypeList(false);
  };

  const isReadOnly = ['title', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by', 'id'].includes(property.type);

  const filteredTypes = TYPE_OPTIONS.filter(t =>
    t.label.toLowerCase().includes(typeSearch.toLowerCase())
  );

  // Calculate panel position to stay within viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(position.top, window.innerHeight - 400),
    left: Math.min(position.left, window.innerWidth - 280),
    zIndex: 60,
  };

  return (
    <div ref={panelRef} style={style}
      className="w-[280px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">

      {/* ─── Property name + clickable icon ─── */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <PropertyIconButton
            property={property}
            databaseId={databaseId}
          />
          <input
            ref={nameRef}
            value={propName}
            onChange={e => setPropName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') { commitName(); nameRef.current?.blur(); } }}
            className="flex-1 text-sm font-medium text-gray-900 outline-none bg-transparent border-b border-transparent focus:border-blue-500 px-1 py-0.5 transition-colors"
            placeholder="Property name"
            disabled={property.type === 'title'}
          />
        </div>
      </div>

      {/* ─── Type selector ─── */}
      {!isReadOnly && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowTypeList(!showTypeList)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 text-sm text-gray-700 transition-colors">
            <div className="flex items-center gap-2">
              {getPropIcon(property.type, 'w-3.5 h-3.5 text-gray-400')}
              <span>Type: <span className="font-medium">{TYPE_OPTIONS.find(t => t.type === property.type)?.label || property.type}</span></span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showTypeList ? 'rotate-90' : ''}`} />
          </button>

          {showTypeList && (
            <div className="mt-1 border border-gray-100 rounded-lg bg-gray-50 overflow-hidden">
              <div className="p-1.5">
                <input
                  value={typeSearch}
                  onChange={e => setTypeSearch(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-md bg-white border border-gray-200 outline-none focus:border-blue-400 placeholder:text-gray-400"
                  placeholder="Search type..."
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto px-1 pb-1">
                {filteredTypes.map(opt => (
                  <button key={opt.type} onClick={() => changeType(opt.type)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${opt.type === property.type
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-white'
                      }`}>
                    <span className="text-gray-400">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Divider ─── */}
      <div className="h-px bg-gray-100" />

      {/* ─── Formula-specific: Edit formula button ─── */}
      {property.type === 'formula' && (
        <>
          <div className="py-1 px-1">
            <ActionButton
              icon={<Sigma className="w-3.5 h-3.5" />}
              label="Edit formula"
              onClick={() => setShowFormulaEditor(true)}
            />
          </div>
          <div className="h-px bg-gray-100" />
        </>
      )}

      {/* ─── Relation-specific: Edit relation button ─── */}
      {property.type === 'relation' && (
        <>
          <div className="py-1 px-1">
            <ActionButton
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              label="Edit relation"
              onClick={() => setShowRelationEditor(true)}
            />
          </div>
          <div className="h-px bg-gray-100" />
        </>
      )}

      {/* ─── Rollup-specific: Edit rollup button ─── */}
      {property.type === 'rollup' && (
        <>
          <div className="py-1 px-1">
            <ActionButton
              icon={<GitBranch className="w-3.5 h-3.5" />}
              label="Edit rollup"
              onClick={() => setShowRollupEditor(true)}
            />
          </div>
          <div className="h-px bg-gray-100" />
        </>
      )}

      {/* ─── Quick actions ─── */}
      <div className="py-1 px-1">
        <ActionButton
          icon={<Filter className="w-3.5 h-3.5" />}
          label="Filter by this property"
          onClick={() => { addFilter(viewId, { propertyId: property.id, operator: 'is_not_empty', value: '' }); onClose(); }}
        />
        <ActionButton
          icon={<ArrowUp className="w-3.5 h-3.5" />}
          label="Sort ascending"
          onClick={() => { addSort(viewId, { propertyId: property.id, direction: 'asc' }); onClose(); }}
        />
        <ActionButton
          icon={<ArrowDown className="w-3.5 h-3.5" />}
          label="Sort descending"
          onClick={() => { addSort(viewId, { propertyId: property.id, direction: 'desc' }); onClose(); }}
        />
        {(property.type === 'select' || property.type === 'status' || property.type === 'multi_select' || property.type === 'checkbox' || property.type === 'person' || property.type === 'user') && (
          <ActionButton
            icon={<Group className="w-3.5 h-3.5" />}
            label="Group by this property"
            onClick={() => { setGrouping(viewId, { propertyId: property.id }); onClose(); }}
          />
        )}
      </div>

      <div className="h-px bg-gray-100" />

      {/* ─── View actions ─── */}
      <div className="py-1 px-1">
        <ActionButton
          icon={<EyeOff className="w-3.5 h-3.5" />}
          label="Hide in view"
          onClick={() => { togglePropertyVisibility(viewId, property.id); onClose(); }}
          disabled={property.type === 'title'}
        />
        <ActionButton
          icon={<PanelLeftClose className="w-3.5 h-3.5" />}
          label="Insert left"
          onClick={() => {
            const view = views[viewId];
            const idx = view?.visibleProperties.indexOf(property.id) ?? 0;
            const prevPropId = idx > 0 ? view.visibleProperties[idx - 1] : null;
            insertPropertyAt(databaseId, 'New column', 'text', viewId, prevPropId);
            onClose();
          }}
        />
        <ActionButton
          icon={<PanelRightClose className="w-3.5 h-3.5" />}
          label="Insert right"
          onClick={() => {
            insertPropertyAt(databaseId, 'New column', 'text', viewId, property.id);
            onClose();
          }}
        />
      </div>

      {/* ─── Delete ─── */}
      {property.type !== 'title' && !isReadOnly && (
        <>
          <div className="h-px bg-gray-100" />
          <div className="py-1 px-1">
            <ActionButton
              icon={<Trash2 className="w-3.5 h-3.5" />}
              label="Delete property"
              onClick={() => { deleteProperty(databaseId, property.id); onClose(); }}
              danger
            />
          </div>
        </>
      )}

      {/* ─── Formula Editor Portal ─── */}
      {showFormulaEditor && (
        <FormulaEditorPanel
          databaseId={databaseId}
          propertyId={property.id}
          onClose={() => setShowFormulaEditor(false)}
        />
      )}

      {/* ─── Relation Editor Portal ─── */}
      {showRelationEditor && (
        <RelationEditorPanel
          databaseId={databaseId}
          propertyId={property.id}
          onClose={() => setShowRelationEditor(false)}
          position={position}
        />
      )}

      {/* ─── Rollup Editor Portal ─── */}
      {showRollupEditor && (
        <RollupEditorPanel
          databaseId={databaseId}
          propertyId={property.id}
          onClose={() => setShowRollupEditor(false)}
          position={position}
        />
      )}
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${disabled
        ? 'text-gray-300 cursor-not-allowed'
        : danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-700 hover:bg-gray-50'
        }`}>
      <span className={disabled ? 'text-gray-300' : danger ? 'text-red-500' : 'text-gray-400'}>{icon}</span>
      {label}
    </button>
  );
}

function PropertyIconButton({ property, databaseId }: { property: SchemaProperty; databaseId: string }) {
  const [showPicker, setShowPicker] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { updateProperty } = useDatabaseStore();

  const currentIconName = property.icon || DEFAULT_PROPERTY_ICONS[property.type] || 'type';

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
        title="Change icon"
      >
        <Icon name={currentIconName} className="w-4 h-4 text-gray-400" />
      </button>
      {showPicker && (
        <IconPickerPopover
          anchorRef={btnRef}
          value={property.icon || null}
          onSelect={(name) => {
            updateProperty(databaseId, property.id, { icon: name });
            setShowPicker(false);
          }}
          onRemove={() => {
            updateProperty(databaseId, property.id, { icon: undefined });
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
