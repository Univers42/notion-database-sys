/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   propertyTypes.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Centralized property type metadata — labels, icons, grouping
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { PropertyType } from '../types/database';
import {
  Type, Hash, Calendar, CheckSquare, User, Link, Mail, Phone, Tag, List,
  Clock, GitBranch, Sigma, CircleDot, MapPin, FileText, MousePointerClick,
  Fingerprint, Users, ChevronRight, Calculator,
} from 'lucide-react';

export interface PropertyTypeMeta {
  type: PropertyType;
  label: string;
  icon: React.ReactNode;
  group: 'Basic' | 'Advanced' | 'Relation' | 'Action' | 'Auto';
}

const icon = (Comp: React.ElementType) => React.createElement(Comp, { className: 'w-4 h-4' });

export const PROPERTY_TYPE_OPTIONS: readonly PropertyTypeMeta[] = [
  { type: 'text',             label: 'Text',             icon: icon(Type),            group: 'Basic' },
  { type: 'number',           label: 'Number',           icon: icon(Hash),            group: 'Basic' },
  { type: 'select',           label: 'Select',           icon: icon(List),            group: 'Basic' },
  { type: 'multi_select',     label: 'Multi-select',     icon: icon(Tag),             group: 'Basic' },
  { type: 'status',           label: 'Status',           icon: icon(CircleDot),       group: 'Basic' },
  { type: 'date',             label: 'Date',             icon: icon(Calendar),        group: 'Basic' },
  { type: 'checkbox',         label: 'Checkbox',         icon: icon(CheckSquare),     group: 'Basic' },
  { type: 'person',           label: 'Person',           icon: icon(Users),           group: 'Advanced' },
  { type: 'url',              label: 'URL',              icon: icon(Link),            group: 'Advanced' },
  { type: 'email',            label: 'Email',            icon: icon(Mail),            group: 'Advanced' },
  { type: 'phone',            label: 'Phone',            icon: icon(Phone),           group: 'Advanced' },
  { type: 'files_media',      label: 'Files & media',    icon: icon(FileText),        group: 'Advanced' },
  { type: 'place',            label: 'Location',         icon: icon(MapPin),          group: 'Advanced' },
  { type: 'id',               label: 'ID',               icon: icon(Fingerprint),     group: 'Advanced' },
  { type: 'assigned_to',      label: 'Assigned to',      icon: icon(Users),           group: 'Advanced' },
  { type: 'due_date',         label: 'Due date',         icon: icon(Calendar),        group: 'Advanced' },
  { type: 'relation',         label: 'Relation',         icon: icon(ChevronRight),    group: 'Relation' },
  { type: 'rollup',           label: 'Rollup',           icon: icon(Calculator),      group: 'Relation' },
  { type: 'formula',          label: 'Formula',          icon: icon(Sigma),           group: 'Relation' },
  { type: 'button',           label: 'Button',           icon: icon(MousePointerClick), group: 'Action' },
  { type: 'created_time',     label: 'Created time',     icon: icon(Clock),           group: 'Auto' },
  { type: 'last_edited_time', label: 'Last edited time', icon: icon(Clock),           group: 'Auto' },
  { type: 'created_by',       label: 'Created by',       icon: icon(User),            group: 'Auto' },
  { type: 'last_edited_by',   label: 'Last edited by',   icon: icon(User),            group: 'Auto' },
  { type: 'custom',           label: 'Custom',           icon: icon(Hash),            group: 'Advanced' },
] as const;

/** Quick lookup: type string → display label */
export function getPropertyTypeLabel(type: PropertyType | string): string {
  return PROPERTY_TYPE_OPTIONS.find(o => o.type === type)?.label ?? type;
}

/** Returns the icon node for a property type */
export function getPropertyTypeIcon(type: PropertyType | string): React.ReactNode {
  return PROPERTY_TYPE_OPTIONS.find(o => o.type === type)?.icon ?? icon(Type);
}
