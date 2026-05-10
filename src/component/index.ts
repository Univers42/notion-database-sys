/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/10 00:36:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export { ObjectDatabase } from '../object_database';
export { AdapterError } from './types';
export type {
  ChangeEvent,
  DocFilter,
  NotionState,
  ObjectDatabaseAdapter,
  ObjectDatabaseInstance,
  ObjectDatabaseProps,
  Page,
  PageQuery,
  PropertyType,
  SchemaProperty,
} from './types';
export { HttpAdapter, InMemoryAdapter, RemoteAdapter } from './adapters';
