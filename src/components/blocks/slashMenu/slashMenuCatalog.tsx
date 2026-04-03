/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   slashMenuCatalog.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:58:59 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 14:52:49 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import {
  IconText, IconH1, IconH2, IconH3, IconH4, IconH5, IconH6,
  IconBullet, IconNumbered, IconTodo, IconToggle, IconPage,
  IconCallout, IconQuote, IconTable, IconDivider, IconLinkToPage,
  IconImage, IconVideo, IconAudio, IconCode, IconFile, IconBookmark,
  IconBoard, IconColumns, IconTOC,
  IconEquation, IconSpacer, IconEmbed, IconBreadcrumb,
} from './SlashMenuIcons';
import type { BlockType } from '../../../types/database';

/** Describes a single entry in the slash command menu. */
export interface SlashMenuItem {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  section: 'basic' | 'media' | 'layout' | 'advanced' | 'database';
  keywords?: string[];
}

/** Complete catalog of slash command menu items grouped by section. */
export const SLASH_ITEMS: SlashMenuItem[] = [
  // ── Basic blocks
  { type: 'paragraph',      label: 'Text',           icon: <IconText />,       section: 'basic', keywords: ['text', 'paragraph', 'plain'] },
  { type: 'heading_1',      label: 'Heading 1',      icon: <IconH1 />,         section: 'basic', shortcut: '#',    keywords: ['heading', 'h1', 'title'] },
  { type: 'heading_2',      label: 'Heading 2',      icon: <IconH2 />,         section: 'basic', shortcut: '##',   keywords: ['heading', 'h2', 'subtitle'] },
  { type: 'heading_3',      label: 'Heading 3',      icon: <IconH3 />,         section: 'basic', shortcut: '###',  keywords: ['heading', 'h3'] },
  { type: 'heading_4',      label: 'Heading 4',      icon: <IconH4 />,         section: 'basic', shortcut: '####', keywords: ['heading', 'h4'] },
  { type: 'heading_5',      label: 'Heading 5',      icon: <IconH5 />,         section: 'basic', shortcut: '#####', keywords: ['heading', 'h5'] },
  { type: 'heading_6',      label: 'Heading 6',      icon: <IconH6 />,         section: 'basic', shortcut: '######', keywords: ['heading', 'h6'] },
  { type: 'bulleted_list',  label: 'Bulleted list',  icon: <IconBullet />,     section: 'basic', shortcut: '-',    keywords: ['bullet', 'list', 'unordered'] },
  { type: 'numbered_list',  label: 'Numbered list',  icon: <IconNumbered />,   section: 'basic', shortcut: '1.',   keywords: ['number', 'list', 'ordered'] },
  { type: 'to_do',          label: 'To-do list',     icon: <IconTodo />,       section: 'basic', shortcut: '[]',   keywords: ['todo', 'checkbox', 'check', 'task'] },
  { type: 'toggle',         label: 'Toggle list',    icon: <IconToggle />,     section: 'basic', shortcut: '>',    keywords: ['toggle', 'collapse', 'expand'] },
  { type: 'page',           label: 'Page',           icon: <IconPage />,       section: 'basic',                   keywords: ['page', 'subpage'] },
  { type: 'callout',        label: 'Callout',        icon: <IconCallout />,    section: 'basic',                   keywords: ['callout', 'notice', 'alert'] },
  { type: 'quote',          label: 'Quote',          icon: <IconQuote />,      section: 'basic', shortcut: '"',    keywords: ['quote', 'blockquote'] },
  { type: 'table_block',    label: 'Table',          icon: <IconTable />,      section: 'basic',                   keywords: ['table', 'grid'] },
  { type: 'divider',        label: 'Divider',        icon: <IconDivider />,    section: 'basic', shortcut: '---',  keywords: ['divider', 'separator', 'hr'] },
  { type: 'link_to_page',   label: 'Link to page',   icon: <IconLinkToPage />, section: 'basic',                   keywords: ['link', 'page', 'reference'] },

  // ── Media
  { type: 'image',          label: 'Image',          icon: <IconImage />,      section: 'media',                   keywords: ['image', 'picture', 'photo'] },
  { type: 'video',          label: 'Video',          icon: <IconVideo />,      section: 'media',                   keywords: ['video', 'movie', 'clip'] },
  { type: 'audio',          label: 'Audio',          icon: <IconAudio />,      section: 'media',                   keywords: ['audio', 'sound', 'music'] },
  { type: 'code',           label: 'Code',           icon: <IconCode />,       section: 'media', shortcut: '```',  keywords: ['code', 'snippet', 'program'] },
  { type: 'file',           label: 'File',           icon: <IconFile />,       section: 'media',                   keywords: ['file', 'upload', 'attachment'] },
  { type: 'bookmark',       label: 'Web bookmark',   icon: <IconBookmark />,   section: 'media',                   keywords: ['bookmark', 'link', 'embed', 'web'] },
  { type: 'embed',          label: 'Embed',          icon: <IconEmbed />,      section: 'media',                   keywords: ['embed', 'iframe', 'youtube', 'figma', 'vimeo', 'video'] },

  // ── Layout
  { type: 'column',         label: 'Columns',        icon: <IconColumns />,    section: 'layout',                  keywords: ['column', 'columns', 'layout', 'side', 'split', 'grid'] },
  { type: 'spacer',         label: 'Spacer',         icon: <IconSpacer />,     section: 'layout',                  keywords: ['spacer', 'space', 'gap', 'padding'] },

  // ── Advanced
  { type: 'table_of_contents', label: 'Table of contents', icon: <IconTOC />,  section: 'advanced',                keywords: ['toc', 'table of contents', 'contents', 'outline', 'navigation'] },
  { type: 'equation',       label: 'Equation',       icon: <IconEquation />,   section: 'advanced',                keywords: ['equation', 'math', 'latex', 'formula', 'katex'] },
  { type: 'breadcrumb',     label: 'Breadcrumb',     icon: <IconBreadcrumb />, section: 'advanced',                keywords: ['breadcrumb', 'navigation', 'path', 'trail'] },

  // ── Database
  { type: 'database_inline',    label: 'Database - Inline',    icon: <IconTable />,   section: 'database', keywords: ['database', 'inline', 'table', 'spreadsheet', 'data'] },
  { type: 'database_full_page', label: 'Database - Full page', icon: <IconBoard />,   section: 'database', keywords: ['database', 'full', 'page', 'standalone'] },
];

/** Human-readable labels for slash menu sections. */
export const SECTION_LABELS: Record<string, string> = {
  basic: 'Basic blocks',
  media: 'Media',
  layout: 'Layout',
  advanced: 'Advanced',
  database: 'Database',
};
