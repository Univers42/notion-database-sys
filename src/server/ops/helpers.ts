/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   helpers.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 21:01:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { safeString } from '../../utils/safeString';

/** Parses a CSV line respecting quoted fields. */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes && ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (inQuotes && ch === '"') {
      inQuotes = false;
    } else if (inQuotes) {
      current += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/** Escape a value for CSV output. */
export function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replaceAll('"', '""')}"`;
  }
  return val;
}

/** SQL-safe identifier quoting. */
export function sqlId(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

/** SQL-safe string literal. */
export function sqlLit(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (Array.isArray(val)) return `ARRAY[${val.map(v => sqlLit(v)).join(',')}]`;
  return `'${safeString(val).replaceAll("'", "''")}'`;
}

/** MongoDB-safe value literal for display. */
export function mongoLit(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (Array.isArray(val)) return JSON.stringify(val);
  if (val instanceof Date) return `ISODate("${val.toISOString()}")`;
  return JSON.stringify(safeString(val));
}
