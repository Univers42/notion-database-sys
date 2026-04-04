// ─── Filter — AST-based filter tree for complex queries ─────────────────────

/** Leaf operators */
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

/** Leaf condition — matches a single property */
export interface FilterCondition {
  type: 'condition';
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: unknown;
}

/** Compound group — AND / OR with nested children */
export interface FilterGroup {
  type: 'group';
  id: string;
  conjunction: 'and' | 'or';
  children: FilterNode[];
}

/** A filter node is either a leaf condition or a compound group (AST) */
export type FilterNode = FilterCondition | FilterGroup;

/**
 * Legacy flat filter — kept for backward compatibility with existing frontend.
 * New code should use FilterNode (AST).
 */
export interface Filter {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: unknown;
}

// ─── Sort ────────────────────────────────────────────────────────────────────

export interface Sort {
  id: string;
  propertyId: string;
  direction: 'asc' | 'desc';
}

// ─── Grouping ────────────────────────────────────────────────────────────────

export interface Grouping {
  propertyId: string;
  hiddenGroups?: string[];
  sort?: 'alphabetical' | 'manual';
}

export interface SubGrouping {
  propertyId: string;
}
