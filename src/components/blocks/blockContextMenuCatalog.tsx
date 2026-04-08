import React from 'react';
import type { Block } from '../../types/database';
import {
  IconText,
  IconH1,
  IconH2,
  IconH3,
  IconBullet,
  IconNumbered,
  IconTodo,
  IconToggle,
  IconQuote,
  IconCode,
  IconCallout,
  IconDivider,
} from './slashMenu/SlashMenuIcons';

export interface BlockTransformOption {
  type: Block['type'];
  label: string;
  icon: React.ReactNode;
}

export const BLOCK_TRANSFORM_OPTIONS: readonly BlockTransformOption[] = [
  { type: 'paragraph', label: 'Text', icon: <IconText /> },
  { type: 'heading_1', label: 'Heading 1', icon: <IconH1 /> },
  { type: 'heading_2', label: 'Heading 2', icon: <IconH2 /> },
  { type: 'heading_3', label: 'Heading 3', icon: <IconH3 /> },
  { type: 'bulleted_list', label: 'Bulleted list', icon: <IconBullet /> },
  { type: 'numbered_list', label: 'Numbered list', icon: <IconNumbered /> },
  { type: 'to_do', label: 'To-do list', icon: <IconTodo /> },
  { type: 'toggle', label: 'Toggle list', icon: <IconToggle /> },
  { type: 'quote', label: 'Quote', icon: <IconQuote /> },
  { type: 'code', label: 'Code', icon: <IconCode /> },
  { type: 'callout', label: 'Callout', icon: <IconCallout /> },
  { type: 'divider', label: 'Divider', icon: <IconDivider /> },
] as const;
