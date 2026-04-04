/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   fileWatcher.constants.ts                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { join, resolve } from 'node:path';
import type { DbSourceType } from './fileWatcher.types';

export const ROOT = resolve(process.cwd());

export const SOURCE_DIR: Record<DbSourceType, string> = {
  json: join(ROOT, 'src', 'store', 'dbms', 'json'),
  csv: join(ROOT, 'src', 'store', 'dbms', 'csv'),
  mongodb: join(ROOT, 'src', 'store', 'dbms', 'mongodb'),
  postgresql: join(ROOT, 'src', 'store', 'dbms', 'relational'),
};

/** Map entity file basename → database ID (shared across all sources). */
export const FILE_TO_DB: Record<string, string> = {
  'tasks': 'db-tasks',
  'contacts': 'db-crm',
  'content': 'db-content',
  'inventory': 'db-inventory',
  'products': 'db-products',
  'projects': 'db-projects',
};

export const STATE_FILE = '_notion_state.json';
export const FIELD_MAP_FILE = '_field_map.json';
