/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   adapterContext.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/29 21:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/29 21:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Its own module so a component can read the adapter without importing
// object_database.tsx, which imports the components (a cycle).

import { createContext } from 'react';
import type { ObjectDatabaseAdapter } from './types';

export const AdapterContext = createContext<ObjectDatabaseAdapter | null>(null);
export const AdapterProvider = AdapterContext.Provider;
