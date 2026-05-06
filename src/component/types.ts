/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   types.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/07 00:51:16 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ObjectDatabaseAdapter } from '@notion-db/contract-types';
import type React from 'react';
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

/** Host-rendered replacement for the built-in ObjectDatabase page peek/modal. */
export type ObjectDatabasePageRenderer = (
  pageId: string,
  state: ExtendedDatabaseState,
  onClose: () => void,
) => React.ReactNode;

/** Props accepted by the embeddable ObjectDatabase root component. */
export interface ObjectDatabaseProps {
  mode?: 'page' | 'inline';
  databaseId?: string;
  adapter?: ObjectDatabaseAdapter;
  theme?: 'light' | 'dark' | (string & {});
  initialView?: string | null;
  onPageOpen?: (pageId: string | null) => void;
  renderPage?: ObjectDatabasePageRenderer;
  className?: string;
}

/** Imperative handle exposed by ObjectDatabase refs. */
export interface ObjectDatabaseInstance {
  refresh: () => Promise<void>;
  getState: () => ExtendedDatabaseState;
  openPage: (pageId: string | null) => void;
}
