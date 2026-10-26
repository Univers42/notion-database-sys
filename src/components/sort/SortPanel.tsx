/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SortPanel.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:55 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { DatabaseSchema, ViewConfig } from '../../types/database';
import { SortRules } from './SortRules';

/** The toolbar's Sort popover body: the view's sort rules. */
export function SortPanel({ database, view, onClose }: Readonly<{ database: DatabaseSchema; view: ViewConfig; onClose: () => void }>) {
  return <SortRules viewId={view.id} properties={database.properties} sorts={view.sorts || []} onEmptyClose={onClose} />;
}
