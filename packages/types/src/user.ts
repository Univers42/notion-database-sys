/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:44 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:07:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ObjectId, Timestamps } from './common';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  locale: string;
  startPage?: ObjectId;
  sidebarCollapsed: boolean;
}

export interface User extends Timestamps {
  _id: ObjectId;
  email: string;
  name: string;
  avatar?: string;
  passwordHash: string;
  preferences: UserPreferences;
  lastLoginAt?: string;
}
