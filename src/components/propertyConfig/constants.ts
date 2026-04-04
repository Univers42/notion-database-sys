/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:36:39 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { getPropertyTypeIcon } from '../../utils/propertyTypes';

export { PROPERTY_ICON_NAMES as DEFAULT_PROPERTY_ICONS } from '../../utils/propertyIcons';
export { PROPERTY_TYPE_OPTIONS as TYPE_OPTIONS } from '../../utils/propertyTypes';

export function getPropIcon(type: string, _className = 'w-4 h-4') {
  return getPropertyTypeIcon(type);
}
