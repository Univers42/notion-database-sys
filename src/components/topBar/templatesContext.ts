/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   templatesContext.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/25 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/25 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { createContext, useContext } from 'react';
import type { ObjectDatabaseTemplatesController } from '../../component/types';

/** Host-provided templates controller; null in the standalone playground. */
export const TemplatesContext = createContext<ObjectDatabaseTemplatesController | null>(null);

/** Read the templates controller (null → render the plain "New" button). */
export function useTemplatesController(): ObjectDatabaseTemplatesController | null {
  return useContext(TemplatesContext);
}
