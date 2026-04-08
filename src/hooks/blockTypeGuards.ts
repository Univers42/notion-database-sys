import type { Block } from '../types/database';

export function isHeadingType(type: Block['type']): type is
  'heading_1' | 'heading_2' | 'heading_3' | 'heading_4' | 'heading_5' | 'heading_6' {
  return type === 'heading_1'
    || type === 'heading_2'
    || type === 'heading_3'
    || type === 'heading_4'
    || type === 'heading_5'
    || type === 'heading_6';
}

export function isTodoType(type: Block['type']): type is 'to_do' {
  return type === 'to_do';
}

export function continuesWithSameTypeOnEnter(type: Block['type']): type is
  'bulleted_list' | 'numbered_list' | 'to_do' {
  return type === 'bulleted_list'
    || type === 'numbered_list'
    || type === 'to_do';
}

export function isEffectivelyEmpty(text: string): boolean {
  return text
    .replaceAll('\u00a0', ' ')
    .replaceAll(/[\u200B-\u200D\uFEFF]/g, '')
    .trim() === '';
}
