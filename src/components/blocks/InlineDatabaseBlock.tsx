/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   InlineDatabaseBlock.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:35:21 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// InlineDatabaseBlock — inline database embed in page content
// ═══════════════════════════════════════════════════════════════════════════════
//
// This is a thin wrapper: it reads the block's databaseId + viewId, then
// renders the same DatabaseBlock component used for the full-page app —
// just in inline mode. Zero duplication, identical functionality.
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { DatabaseBlock } from '../DatabaseBlock';

export function InlineDatabaseBlock({ block }: Readonly<BlockRendererProps>) {
  return (
    <DatabaseBlock
      databaseId={block.databaseId}
      initialViewId={block.viewId}
      mode="inline"
    />
  );
}
