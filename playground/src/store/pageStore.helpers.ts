/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pageStore.helpers.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 03:57:44 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Block, BlockType } from '@src/types/database';
import type { SeedPage } from '../data/seedPages';
import type { ActivePage, PageEntry } from './pageStore.types';

const RECENTS_KEY = 'pg:recents';

/** A 24-hex-char string that looks like a MongoDB ObjectId. */
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** Returns `true` when `id` looks like a valid MongoDB ObjectId. */
export function isMongoId(id: string): boolean {
  return OBJECT_ID_RE.test(id);
}

export function loadRecents(): ActivePage[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]') as ActivePage[];
  } catch {
    return [];
  }
}

export function saveRecents(recents: ActivePage[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  } catch {
    // localStorage might be unavailable (e.g. private browsing quota)
  }
}

/** Convert seed page format to PageEntry (with content) */
export function seedToEntry(sp: SeedPage): PageEntry {
  return {
    _id:          sp._id,
    title:        sp.title,
    icon:         sp.icon,
    workspaceId:  sp.workspaceId,
    parentPageId: sp.parentPageId ?? null,
    databaseId:   sp.databaseId ?? null,
    archivedAt:   sp.archivedAt ?? null,
    content:      sp.content,
  };
}

let _localIdCounter = 0;

export function localId(): string {
  return `local-page-${++_localIdCounter}-${Date.now().toString(36)}`;
}

export function updatePageInState(
  pages: Record<string, PageEntry[]>,
  pageId: string,
  updater: (page: PageEntry) => PageEntry,
): Record<string, PageEntry[]> {
  const newPages = { ...pages };
  for (const wsId of Object.keys(newPages)) {
    const list = newPages[wsId];
    const idx = list.findIndex(p => p._id === pageId);
    if (idx < 0) continue;
    newPages[wsId] = list.map((p, i) => i === idx ? updater(p) : p);
    return newPages;
  }
  return pages;
}

/** Creates a page updater that patches a single block. */
export function applyBlockUpdate(blockId: string, updates: Partial<Block>): (page: PageEntry) => PageEntry {
  return (page) => ({
    ...page,
    content: (page.content ?? []).map(b => b.id === blockId ? { ...b, ...updates } : b),
  });
}

/** Creates a page updater that inserts a block after another. */
export function applyBlockInsert(afterBlockId: string, block: Block): (page: PageEntry) => PageEntry {
  return (page) => {
    const content = [...(page.content ?? [])];
    const afterIdx = content.findIndex(b => b.id === afterBlockId);
    if (afterIdx >= 0) content.splice(afterIdx + 1, 0, block);
    else content.push(block);
    return { ...page, content };
  };
}

/** Creates a page updater that removes a block. */
export function applyBlockDelete(blockId: string): (page: PageEntry) => PageEntry {
  return (page) => ({
    ...page,
    content: (page.content ?? []).filter(b => b.id !== blockId),
  });
}

/** Creates a page updater that reorders a block to a target index. */
export function applyBlockMove(blockId: string, targetIndex: number): (page: PageEntry) => PageEntry {
  return (page) => {
    const content = [...(page.content ?? [])];
    const fromIdx = content.findIndex(b => b.id === blockId);
    if (fromIdx < 0) return page;

    const [moved] = content.splice(fromIdx, 1);
    const boundedTarget = Math.max(0, Math.min(targetIndex, content.length));
    const insertIdx = fromIdx < targetIndex ? boundedTarget - 1 : boundedTarget;
    content.splice(Math.max(0, insertIdx), 0, moved);

    return { ...page, content };
  };
}

/** Creates a page updater that changes a block's type. */
export function applyBlockTypeChange(blockId: string, newType: BlockType): (page: PageEntry) => PageEntry {
  return (page) => ({
    ...page,
    content: (page.content ?? []).map(b => b.id === blockId ? { ...b, type: newType } : b),
  });
}
