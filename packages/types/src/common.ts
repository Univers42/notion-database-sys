/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   common.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:06:58 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** Timestamp fields shared by most documents */
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

/** Soft-delete marker */
export interface SoftDeletable {
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}
