/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:36:39 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:46 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { PropertyType } from '../../types/database';
import { PROPERTY_ICON_NAMES as DEFAULT_PROPERTY_ICONS } from '../../utils/propertyIcons';
import { PROPERTY_TYPE_OPTIONS as TYPE_OPTIONS, getPropertyTypeIcon } from '../../utils/propertyTypes';
import {
  Type, Hash, Calendar, CheckSquare, User, Link, Mail, Phone, Tag, List,
  Clock, Calculator, CircleDot, MapPin, FileText, MousePointerClick,
  Fingerprint, Users, ChevronRight,
} from 'lucide-react';

export { DEFAULT_PROPERTY_ICONS, TYPE_OPTIONS };

export function getPropIcon(type: string, className = 'w-4 h-4') {
  return getPropertyTypeIcon(type);
}
