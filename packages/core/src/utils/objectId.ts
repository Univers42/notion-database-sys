/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   objectId.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 03:55:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 03:54:57 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Types } from 'mongoose';

/** Returns `true` when `value` is a valid 24-hex-char MongoDB ObjectId. */
export function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value) && new Types.ObjectId(value).toString() === value;
}
