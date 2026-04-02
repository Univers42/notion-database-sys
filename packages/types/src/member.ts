/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   member.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:07:18 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ObjectId, Timestamps } from './common';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

export interface WorkspaceMember extends Timestamps {
  _id: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  role: WorkspaceRole;
  invitedBy?: ObjectId;
  joinedAt: string;
}
