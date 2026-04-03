/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   cn.ts                                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 16:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Lightweight className composer.
 *
 * Concatenates truthy class strings, filtering out falsy values.
 * Used by every slot-enabled component to merge default + override classes.
 *
 * @example
 *   cn("px-2 py-1", active && "bg-blue-500", slots?.item)
 *   // → "px-2 py-1 bg-blue-500 custom-override"
 */
export function cn(...classes: (string | undefined | null | false | 0)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Merges a partial slot override object on top of a full defaults record.
 * Returns a merged Record where every key has the default + any user override
 * concatenated together.
 *
 * @example
 *   const merged = mergeSlots(
 *     { root: "flex flex-col", item: "px-2" },
 *     { item: "text-lg" }
 *   );
 *   // → { root: "flex flex-col", item: "px-2 text-lg" }
 */
export function mergeSlots<K extends string>(
  defaults: Record<K, string>,
  overrides?: Partial<Record<K, string>>,
): Record<K, string> {
  if (!overrides) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as K[]) {
    if (overrides[key]) {
      result[key] = cn(defaults[key], overrides[key]);
    }
  }
  return result;
}
