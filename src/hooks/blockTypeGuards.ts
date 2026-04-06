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
