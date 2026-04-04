/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   validation-result.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 18:45:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export interface ValidationResult {
  /** Whether the value passed validation (possibly after coercion). */
  ok: boolean;
  /** The coerced/cleaned value to store. Only meaningful when `ok` is true. */
  value: unknown;
  /** Human-readable reason when `ok` is false. */
  reason?: string;
}

export function ok(value: unknown): ValidationResult {
  return { ok: true, value };
}

export function fail(reason: string): ValidationResult {
  return { ok: false, value: undefined, reason };
}
