/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   propertyIcons.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:15:34 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { PropertyType } from '../types/database';

/**
 * Maps a property type to a canonical icon name string.
 * These names are used by the Icon component and icon picker system.
 */
export const PROPERTY_ICON_NAMES: Readonly<Record<PropertyType, string>> = {
  title:           'document',
  text:            'pencil-square-outline',
  number:          '123',
  select:          'check',
  multi_select:    'checkmark-list',
  status:          'activity-rectangle',
  date:            'calendar',
  checkbox:        'checkmark-square',
  person:          'vitruvian-man-circle',
  user:            'vitruvian-man-circle',
  url:             'arrow-northeast',
  email:           'exclamation-speech-bubble',
  phone:           'bell',
  files_media:     'paperclip',
  relation:        'arrows-swap-horizontal',
  formula:         'angle-brackets-solidus',
  rollup:          'chart-pie',
  button:          'cursor-click',
  place:           'compass',
  id:              'identification-badge',
  created_time:    'clock',
  last_edited_time:'clock-outline',
  created_by:      'user-speech-bubble',
  last_edited_by:  'user-speech-bubble',
  assigned_to:     'vitruvian-man-circle',
  due_date:        'calendar',
  custom:          'identification-badge',
} as const;

/**
 * Returns the icon name for a property type, falling back to 'document'.
 *
 * @param type - Property type string (e.g. 'select', 'number').
 */
export function getPropertyIconName(type: PropertyType | string): string {
  return (PROPERTY_ICON_NAMES as Record<string, string>)[type] ?? 'document';
}

/**
 * Maps property type to the lucide-react icon component name.
 * Used by table header and property picker renderers.
 */
export const PROPERTY_LUCIDE_ICON: Readonly<Record<PropertyType, string>> = {
  title:           'Type',
  text:            'Type',
  number:          'Hash',
  select:          'List',
  multi_select:    'Tag',
  status:          'CircleDot',
  date:            'Calendar',
  checkbox:        'CheckSquare',
  person:          'Users',
  user:            'Users',
  url:             'Link',
  email:           'Mail',
  phone:           'Phone',
  files_media:     'FileText',
  place:           'MapPin',
  id:              'Fingerprint',
  button:          'MousePointerClick',
  relation:        'ChevronRight',
  formula:         'Sigma',
  rollup:          'GitBranch',
  created_time:    'Clock',
  last_edited_time:'Clock',
  created_by:      'User',
  last_edited_by:  'User',
  assigned_to:     'Users',
  due_date:        'Calendar',
  custom:          'Hash',
} as const;

/** Read-only set of property types that cannot be edited by users */
export const READ_ONLY_PROPERTY_TYPES = new Set<PropertyType>([
  'title',
  'id',
  'created_time',
  'last_edited_time',
  'created_by',
  'last_edited_by',
  'formula',
  'rollup',
]);

/** Property types that support the "group by" operation */
export const GROUPABLE_PROPERTY_TYPES = new Set<PropertyType>([
  'select', 'multi_select', 'status', 'checkbox', 'person', 'user', 'assigned_to',
]);

/** Property types that open a select editor when clicked in table view */
export const SELECT_EDITOR_TYPES = new Set<PropertyType>(['select', 'status', 'multi_select']);
