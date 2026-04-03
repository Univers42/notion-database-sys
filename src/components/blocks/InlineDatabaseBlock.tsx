/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   InlineDatabaseBlock.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 14:52:48 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { DatabaseBlock } from '../DatabaseBlock';

/** Renders an inline database embed using DatabaseBlock in inline mode. */
export function InlineDatabaseBlock({ block }: Readonly<BlockRendererProps>) {
  return (
    <DatabaseBlock
      databaseId={block.databaseId}
      initialViewId={block.viewId}
      mode="inline"
    />
  );
}
