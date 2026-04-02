// ─── Re-export barrel ────────────────────────────────────────────────────────
// All consumers import from this path for backward compatibility.
// The actual store implementation lives at src/store/useDatabaseStore.ts.

export { useDatabaseStore } from '../../useDatabaseStore';
export type { DatabaseState } from './storeTypes';
export type { ExtendedDatabaseState } from '../../useDatabaseStore';
