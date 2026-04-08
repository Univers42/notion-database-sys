import type { Block } from '../../types/database';

export interface BlockLocation {
  block: Block;
  siblings: Block[];
  index: number;
  parentBlockId: string | null;
}

export interface BlockTreeOperationResult {
  blocks: Block[];
  focusBlockId?: string;
  focusAtEnd?: boolean;
}

type SiblingTransformer = (siblings: Block[], index: number) => Block[];

export type RelativeInsertPosition = 'before' | 'after';
export type BlockMoveDirection = 'up' | 'down';

export function findBlockLocation(
  blocks: Block[],
  targetId: string,
  parentBlockId: string | null = null,
): BlockLocation | null {
  const index = blocks.findIndex((block) => block.id === targetId);
  if (index >= 0) {
    return {
      block: blocks[index],
      siblings: blocks,
      index,
      parentBlockId,
    };
  }

  for (const block of blocks) {
    if (!block.children?.length) continue;
    const nested = findBlockLocation(block.children, targetId, block.id);
    if (nested) return nested;
  }

  return null;
}

export function insertBlockRelative(
  blocks: Block[],
  targetId: string,
  newBlock: Block,
  position: RelativeInsertPosition,
): BlockTreeOperationResult {
  return withTransformedSiblings(blocks, targetId, (siblings, index) => {
    const nextBlocks = [...siblings];
    const insertIndex = position === 'before' ? index : index + 1;
    nextBlocks.splice(insertIndex, 0, newBlock);
    return nextBlocks;
  }, { focusBlockId: newBlock.id });
}

export function duplicateBlockInTree(
  blocks: Block[],
  targetId: string,
): BlockTreeOperationResult {
  const location = findBlockLocation(blocks, targetId);
  if (!location) return { blocks };

  const duplicate = cloneBlockTree(location.block);
  return insertBlockRelative(blocks, targetId, duplicate, 'after');
}

export function deleteBlockInTree(
  blocks: Block[],
  targetId: string,
): BlockTreeOperationResult {
  let focusBlockId: string | undefined;
  let focusAtEnd = false;

  const result = withTransformedSiblings(blocks, targetId, (siblings, index) => {
    const nextSibling = siblings[index + 1];
    const prevSibling = siblings[index - 1];
    focusBlockId = nextSibling?.id ?? prevSibling?.id;
    focusAtEnd = !nextSibling && !!prevSibling;
    return siblings.filter((block) => block.id !== targetId);
  });

  return {
    blocks: result.blocks,
    focusBlockId,
    focusAtEnd,
  };
}

export function moveBlockInTree(
  blocks: Block[],
  targetId: string,
  direction: BlockMoveDirection,
): BlockTreeOperationResult {
  const location = findBlockLocation(blocks, targetId);
  if (!location) return { blocks };

  const offset = direction === 'up' ? -1 : 1;
  const targetIndex = location.index + offset;
  if (targetIndex < 0 || targetIndex >= location.siblings.length) {
    return { blocks };
  }

  return withTransformedSiblings(blocks, targetId, (siblings, index) => {
    const nextBlocks = [...siblings];
    const [moved] = nextBlocks.splice(index, 1);
    nextBlocks.splice(targetIndex, 0, moved);
    return nextBlocks;
  }, { focusBlockId: targetId });
}

export function changeBlockTypeInTree(
  blocks: Block[],
  targetId: string,
  nextType: Block['type'],
): BlockTreeOperationResult {
  return withTransformedSiblings(blocks, targetId, (siblings, index) => {
    const nextBlocks = [...siblings];
    nextBlocks[index] = normalizeBlockForType(nextBlocks[index], nextType);
    return nextBlocks;
  }, {
    focusBlockId: nextType === 'divider' ? undefined : targetId,
  });
}

export function cloneBlockTree(block: Block): Block {
  return {
    ...block,
    id: crypto.randomUUID(),
    children: block.children?.map(cloneBlockTree),
  };
}

export function normalizeBlockForType(block: Block, nextType: Block['type']): Block {
  const nextBlock: Block = {
    ...block,
    type: nextType,
  };

  if (nextType === 'divider') {
    nextBlock.content = '';
  }

  if (nextType === 'to_do') {
    nextBlock.checked = block.checked ?? false;
  } else {
    delete nextBlock.checked;
  }

  if (nextType === 'toggle') {
    nextBlock.collapsed = block.collapsed ?? false;
  } else {
    delete nextBlock.collapsed;
  }

  if (nextType === 'code') {
    nextBlock.language = block.language || 'plaintext';
  } else {
    delete nextBlock.language;
  }

  if (nextType === 'callout') {
    nextBlock.color = block.color || '💡';
  } else {
    delete nextBlock.color;
  }

  return nextBlock;
}

function withTransformedSiblings(
  blocks: Block[],
  targetId: string,
  transform: SiblingTransformer,
  meta: Omit<BlockTreeOperationResult, 'blocks'> = {},
): BlockTreeOperationResult {
  const result = transformSiblingArray(blocks, targetId, transform);
  return {
    blocks: result.blocks,
    ...meta,
  };
}

function transformSiblingArray(
  blocks: Block[],
  targetId: string,
  transform: SiblingTransformer,
): { blocks: Block[]; found: boolean } {
  const index = blocks.findIndex((block) => block.id === targetId);
  if (index >= 0) {
    return {
      blocks: transform(blocks, index),
      found: true,
    };
  }

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    if (!block.children?.length) continue;

    const nested = transformSiblingArray(block.children, targetId, transform);
    if (!nested.found) continue;

    const nextBlocks = [...blocks];
    nextBlocks[blockIndex] = {
      ...block,
      children: nested.blocks,
    };
    return { blocks: nextBlocks, found: true };
  }

  return { blocks, found: false };
}
