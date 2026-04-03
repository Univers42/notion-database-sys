/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DividerBlock.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:34:58 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { cn } from '../../utils/cn';

/** Renders a horizontal divider block. */
export function DividerBlock() {
  return (
    <div className={cn("py-2")}>
      <hr className={cn("border-line")} />
    </div>
  );
}
