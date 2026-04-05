/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:44 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Timestamps } from './common.js';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  locale: string;
  startPage?: string;
  sidebarCollapsed: boolean;
}

export interface User extends Timestamps {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  passwordHash: string;
  preferences: UserPreferences;
  lastLoginAt?: string;
}
