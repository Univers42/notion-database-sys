/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:36:39 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 14:52:49 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { PROPERTY_ICON_NAMES as DEFAULT_PROPERTY_ICONS } from '../../utils/propertyIcons';
import { PROPERTY_TYPE_OPTIONS as TYPE_OPTIONS, getPropertyTypeIcon } from '../../utils/propertyTypes';

export { DEFAULT_PROPERTY_ICONS, TYPE_OPTIONS };

export function getPropIcon(type: string, _className = 'w-4 h-4') {
  return getPropertyTypeIcon(type);
}
