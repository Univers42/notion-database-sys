/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   member.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Timestamps } from './common.js';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

export interface WorkspaceMember extends Timestamps {
  _id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedBy?: string;
  joinedAt: string;
}
