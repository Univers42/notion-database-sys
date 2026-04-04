// ─── Common primitives ──────────────────────────────────────────────────────

/** MongoDB ObjectId string representation */
export type ObjectId = string;

/** ISO 8601 date string */
export type ISODateString = string;

/** Heterogeneous property value — use `unknown` to enforce narrowing */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PropertyValue = any;

/** Timestamp fields shared by most documents */
export interface Timestamps {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Soft-delete marker */
export interface SoftDeletable {
  archived?: boolean;
  archivedAt?: ISODateString;
  archivedBy?: ObjectId;
}
