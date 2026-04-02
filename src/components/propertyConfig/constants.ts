/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:36:39 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 14:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { PropertyType } from '../../types/database';
import {
  Type, Hash, Calendar, CheckSquare, User, Link, Mail, Phone, Tag, List,
  Clock, Calculator, CircleDot, MapPin, FileText, MousePointerClick,
  Fingerprint, Users, ChevronRight,
} from 'lucide-react';

export const DEFAULT_PROPERTY_ICONS: Record<string, string> = {
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

export const TYPE_OPTIONS: { type: PropertyType; label: string; icon: React.ReactNode; group: string }[] = [
  { type: 'text', label: 'Text', icon: React.createElement(Type, { className: 'w-4 h-4' }), group: 'Basic' },
  { type: 'number', label: 'Number', icon: React.createElement(Hash, { className: 'w-4 h-4' }), group: 'Basic' },
  { type: 'select', label: 'Select', icon: React.createElement(List, { className: 'w-4 h-4' }), group: 'Basic' },
  { type: 'multi_select', label: 'Multi-select', icon: React.createElement(Tag, { className: 'w-4 h-4' }), group: 'Basic' },
  { type: 'status', label: 'Status', icon: React.createElement(CircleDot, { className: 'w-4 h-4' }), group: 'Basic' },
  { type: 'date', label: 'Date', icon: React.createElement(Calendar, { className: 'w-4 h-4' }), group: 'Basic' },
  { type: 'checkbox', label: 'Checkbox', icon: React.createElement(CheckSquare, { className: 'w-4 h-4' }), group: 'Basic' },
  { type: 'person', label: 'Person', icon: React.createElement(Users, { className: 'w-4 h-4' }), group: 'Advanced' },
  { type: 'url', label: 'URL', icon: React.createElement(Link, { className: 'w-4 h-4' }), group: 'Advanced' },
  { type: 'email', label: 'Email', icon: React.createElement(Mail, { className: 'w-4 h-4' }), group: 'Advanced' },
  { type: 'phone', label: 'Phone', icon: React.createElement(Phone, { className: 'w-4 h-4' }), group: 'Advanced' },
  { type: 'files_media', label: 'Files & media', icon: React.createElement(FileText, { className: 'w-4 h-4' }), group: 'Advanced' },
  { type: 'place', label: 'Location', icon: React.createElement(MapPin, { className: 'w-4 h-4' }), group: 'Advanced' },
  { type: 'id', label: 'ID', icon: React.createElement(Fingerprint, { className: 'w-4 h-4' }), group: 'Advanced' },
  { type: 'relation', label: 'Relation', icon: React.createElement(ChevronRight, { className: 'w-4 h-4' }), group: 'Relation' },
  { type: 'rollup', label: 'Rollup', icon: React.createElement(Calculator, { className: 'w-4 h-4' }), group: 'Relation' },
  { type: 'formula', label: 'Formula', icon: React.createElement(Hash, { className: 'w-4 h-4' }), group: 'Relation' },
  { type: 'button', label: 'Button', icon: React.createElement(MousePointerClick, { className: 'w-4 h-4' }), group: 'Action' },
  { type: 'created_time', label: 'Created time', icon: React.createElement(Clock, { className: 'w-4 h-4' }), group: 'Auto' },
  { type: 'last_edited_time', label: 'Last edited time', icon: React.createElement(Clock, { className: 'w-4 h-4' }), group: 'Auto' },
  { type: 'created_by', label: 'Created by', icon: React.createElement(User, { className: 'w-4 h-4' }), group: 'Auto' },
  { type: 'last_edited_by', label: 'Last edited by', icon: React.createElement(User, { className: 'w-4 h-4' }), group: 'Auto' },
  { type: 'assigned_to', label: 'Assigned to', icon: React.createElement(Users, { className: 'w-4 h-4' }), group: 'Advanced' },
  { type: 'due_date', label: 'Due date', icon: React.createElement(Calendar, { className: 'w-4 h-4' }), group: 'Advanced' },
  { type: 'custom', label: 'Custom', icon: React.createElement(Hash, { className: 'w-4 h-4' }), group: 'Advanced' },
];

export function getPropIcon(type: string, className = 'w-4 h-4') {
  switch (type) {
    case 'title': case 'text': return React.createElement(Type, { className });
    case 'number': return React.createElement(Hash, { className });
    case 'select': return React.createElement(List, { className });
    case 'multi_select': return React.createElement(Tag, { className });
    case 'status': return React.createElement(CircleDot, { className });
    case 'date': return React.createElement(Calendar, { className });
    case 'checkbox': return React.createElement(CheckSquare, { className });
    case 'person': case 'user': return React.createElement(Users, { className });
    case 'email': return React.createElement(Mail, { className });
    case 'phone': return React.createElement(Phone, { className });
    case 'url': return React.createElement(Link, { className });
    case 'files_media': return React.createElement(FileText, { className });
    case 'place': return React.createElement(MapPin, { className });
    case 'id': return React.createElement(Fingerprint, { className });
    case 'button': return React.createElement(MousePointerClick, { className });
    case 'relation': return React.createElement(ChevronRight, { className });
    case 'formula': case 'rollup': return React.createElement(Calculator, { className });
    case 'created_time': case 'last_edited_time': return React.createElement(Clock, { className });
    case 'created_by': case 'last_edited_by': return React.createElement(User, { className });
    case 'assigned_to': return React.createElement(Users, { className });
    case 'due_date': return React.createElement(Calendar, { className });
    case 'custom': return React.createElement(Hash, { className });
    default: return React.createElement(Type, { className });
  }
}
