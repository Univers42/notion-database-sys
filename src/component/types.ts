/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   types.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:48:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ObjectDatabaseAdapter } from '@notion-db/contract-types';
export {
  AdapterError,
} from '@notion-db/contract-types';
export type {
  Block,
  ChangeEvent,
  DatabaseSchema,
  DocFilter,
  Filter,
  Grouping,
  NotionState,
  ObjectDatabaseAdapter,
  Page,
  PageQuery,
  PropertyType,
  SchemaProperty,
  Sort,
  SubGrouping,
  ViewConfig,
} from '@notion-db/contract-types';
import type { ExtendedDatabaseState } from '../store/useDatabaseStore';

/** Props accepted by the embeddable ObjectDatabase root component. */
export interface ObjectDatabaseProps {
  mode?: 'page' | 'inline';
  databaseId?: string;
  adapter?: ObjectDatabaseAdapter;
  theme?: 'light' | 'dark' | (string & {});
  initialView?: string | null;
  onPageOpen?: (pageId: string | null) => void;
  className?: string;
}

/** Imperative handle exposed by ObjectDatabase refs. */
export interface ObjectDatabaseInstance {
  refresh: () => Promise<void>;
  getState: () => ExtendedDatabaseState;
  openPage: (pageId: string | null) => void;
}
