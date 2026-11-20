/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   cardClick.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/11/20 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/11/20 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ViewSettings } from '../../../types/database';

/** A gallery card uses the host's template path only when both sides opt in. */
export function cardClickUsesTemplate(cardClick: ViewSettings['cardClick'], hasHost: boolean): boolean {
  return cardClick === 'use_template' && hasHost;
}
