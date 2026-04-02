/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   workspace.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:08:11 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:08:12 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ObjectId, Timestamps } from './common';

export interface WorkspaceSettings {
  defaultPermission: 'full_access' | 'can_edit' | 'can_comment' | 'can_view';
  allowPublicPages: boolean;
  allowGuestAccess: boolean;
  defaultPageIcon?: string;
  timezone?: string;
}

export interface Workspace extends Timestamps {
  _id: ObjectId;
  name: string;
  icon?: string;
  ownerId: ObjectId;
  plan: 'free' | 'plus' | 'business' | 'enterprise';
  settings: WorkspaceSettings;
  domain?: string;
}
