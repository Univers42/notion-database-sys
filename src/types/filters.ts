/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   filters.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:19:59 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:43:51 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── filters — filter, sort, and grouping type definitions ──────────────────

// ─── FILTER OPERATORS ────────────────────────────────────────────────────────

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_before'
  | 'is_after'
  | 'is_on_or_before'
  | 'is_on_or_after'
  | 'is_between'
  | 'is_relative_to_today'
  | 'is_checked'
  | 'is_not_checked';

export interface Filter {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: unknown;
}

// ─── SORT ────────────────────────────────────────────────────────────────────

export interface Sort {
  id: string;
  propertyId: string;
  direction: 'asc' | 'desc';
}

// ─── GROUPING ────────────────────────────────────────────────────────────────

export interface Grouping {
  propertyId: string;
  hiddenGroups?: string[];
  sort?: 'alphabetical' | 'manual';
}

export interface SubGrouping {
  propertyId: string;
}
