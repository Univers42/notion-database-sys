// ═══════════════════════════════════════════════════════════════════════════════
// Property type → icon mapping (shared across TableView, App, PropertyConfig)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  Type, Hash, Calendar, CheckSquare, User, Link, Mail, Phone,
  List, Tag, CircleDot, MapPin, Fingerprint, FileText,
  MousePointerClick, Users, Clock, Sigma, GitBranch,
  ExternalLink, UserCheck, AlertTriangle, Database,
} from 'lucide-react';

/** Returns a Lucide icon component for the given property type. */
export function PropIcon({ type, className = 'w-3.5 h-3.5' }: { type: string; className?: string }): React.ReactElement {
  switch (type) {
    case 'title':
    case 'text':
      return <Type className={className} />;
    case 'number':
      return <Hash className={className} />;
    case 'select':
      return <List className={className} />;
    case 'multi_select':
      return <Tag className={className} />;
    case 'status':
      return <CircleDot className={className} />;
    case 'date':
      return <Calendar className={className} />;
    case 'checkbox':
      return <CheckSquare className={className} />;
    case 'person':
    case 'user':
      return <Users className={className} />;
    case 'email':
      return <Mail className={className} />;
    case 'phone':
      return <Phone className={className} />;
    case 'url':
      return <Link className={className} />;
    case 'files_media':
      return <FileText className={className} />;
    case 'place':
      return <MapPin className={className} />;
    case 'id':
      return <Fingerprint className={className} />;
    case 'button':
      return <MousePointerClick className={className} />;
    case 'created_time':
    case 'last_edited_time':
      return <Clock className={className} />;
    case 'created_by':
    case 'last_edited_by':
      return <User className={className} />;
    case 'formula':
      return <Sigma className={className} />;
    case 'rollup':
      return <GitBranch className={className} />;
    case 'relation':
      return <ExternalLink className={className} />;
    case 'assigned_to':
      return <UserCheck className={className} />;
    case 'due_date':
      return <AlertTriangle className={className} />;
    case 'custom':
      return <Database className={className} />;
    default:
      return <Type className={className} />;
  }
}

/** Read-only property types that don't support inline editing. */
export const READ_ONLY_TYPES = new Set([
  'created_time',
  'last_edited_time',
  'created_by',
  'last_edited_by',
  'id',
  'rollup',
  'button',
]);

/** Property type labels used in the "add property" dropdown. */
export const ADD_PROPERTY_TYPES: readonly [string, string][] = [
  ['Text', 'text'],
  ['Number', 'number'],
  ['Select', 'select'],
  ['Multi-select', 'multi_select'],
  ['Status', 'status'],
  ['Date', 'date'],
  ['Checkbox', 'checkbox'],
  ['Person', 'person'],
  ['URL', 'url'],
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['Location', 'place'],
  ['Files & media', 'files_media'],
  ['ID', 'id'],
  ['Relation', 'relation'],
  ['Formula', 'formula'],
  ['Rollup', 'rollup'],
  ['Button', 'button'],
  ['Assigned to', 'assigned_to'],
  ['Due date', 'due_date'],
  ['Custom', 'custom'],
] as const;
