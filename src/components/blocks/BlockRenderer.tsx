/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BlockRenderer.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:34:28 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:34:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { Block } from '../../types/database';
import { TextBlock } from './TextBlock';
import { HeadingBlock } from './HeadingBlock';
import { ListBlock } from './ListBlock';
import { TodoBlock } from './TodoBlock';
import { ToggleBlock } from './ToggleBlock';
import { CodeBlock } from './CodeBlock';
import { QuoteBlock } from './QuoteBlock';
import { CalloutBlock } from './CalloutBlock';
import { DividerBlock } from './DividerBlock';
import { TableBlockComponent } from './TableBlockComponent';
import { MediaBlock } from './MediaBlock';
import { PageBlock } from './PageBlock';
import { DatabaseViewBlock } from './DatabaseViewBlock';
import { InlineDatabaseBlock } from './InlineDatabaseBlock';
import { ColumnBlock } from './ColumnBlock';
import { TableOfContentsBlock } from './TableOfContentsBlock';
import { EquationBlock } from './EquationBlock';
import { SpacerBlock } from './SpacerBlock';
import { EmbedBlock } from './EmbedBlock';
import { BreadcrumbBlock } from './BreadcrumbBlock';

export interface BlockRendererProps {
  block: Block;
  pageId: string;
  index: number;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const BlockRenderer = React.memo(function BlockRenderer(props: BlockRendererProps) {
  const { block } = props;

  switch (block.type) {
    case 'paragraph':
      return <TextBlock {...props} />;

    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
    case 'heading_4':
    case 'heading_5':
    case 'heading_6':
      return <HeadingBlock {...props} />;

    case 'bulleted_list':
    case 'numbered_list':
      return <ListBlock {...props} />;

    case 'to_do':
      return <TodoBlock {...props} />;

    case 'toggle':
      return <ToggleBlock {...props} />;

    case 'code':
      return <CodeBlock {...props} />;

    case 'quote':
      return <QuoteBlock {...props} />;

    case 'callout':
      return <CalloutBlock {...props} />;

    case 'divider':
      return <DividerBlock />;

    case 'column':
      return <ColumnBlock {...props} />;

    case 'table_of_contents':
      return <TableOfContentsBlock {...props} />;

    case 'equation':
      return <EquationBlock {...props} />;

    case 'spacer':
      return <SpacerBlock {...props} />;

    case 'embed':
      return <EmbedBlock {...props} />;

    case 'breadcrumb':
      return <BreadcrumbBlock {...props} />;

    case 'synced_block':
      // Render children of the synced block (fallback to text)
      return <TextBlock {...props} />;

    case 'table_block':
      return <TableBlockComponent {...props} />;

    case 'image':
    case 'video':
    case 'audio':
    case 'file':
    case 'bookmark':
      return <MediaBlock {...props} />;

    case 'page':
    case 'link_to_page':
      return <PageBlock {...props} />;

    case 'database_inline':
      return <InlineDatabaseBlock {...props} />;

    case 'database_full_page':
      return <InlineDatabaseBlock {...props} />;

    case 'table_view':
    case 'board_view':
    case 'gallery_view':
    case 'list_view':
      return <DatabaseViewBlock {...props} />;

    default:
      return <TextBlock {...props} />;
  }
});
