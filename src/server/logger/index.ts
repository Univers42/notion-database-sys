// ─── Logger System — barrel export + initialization ──────────────────────────
// Wires together all components in the libcpp pattern:
//   Observer<QueryEvent>  →  subscribers format & log via  →  decorated ILogger chain
//
// Architecture (mirrors libcpp patterns):
//   ┌─────────────────────────────────────────────────────────────────┐
//   │  queryObserver.notify('query', event)                          │
//   │       ↓                                                        │
//   │  QueryStyler.formatQuery(event, verbosity)  →  styled string  │
//   │       ↓                                                        │
//   │  ILogger chain:  Prefix → Timestamp → Color → ConsoleLogger   │
//   │       ↓                                                        │
//   │  stderr                                                        │
//   └─────────────────────────────────────────────────────────────────┘

// ─── Re-exports ──────────────────────────────────────────────────────────────
export { LogLevel, type QueryEvent, type Verbosity, type OpType, getVerbosity } from './types';
export { Observer } from './Observer';
export {
  type ILogger, ConsoleLogger, NullLogger,
  TimestampDecorator, ColorDecorator, PrefixDecorator,
  createLogger, setGlobal, global,
} from './Logger';
export { formatQuery, formatLifecycle, formatBanner } from './QueryStyler';

// ─── Singleton instances ─────────────────────────────────────────────────────

import { Observer } from './Observer';
import { createLogger, setGlobal } from './Logger';
import { LogLevel, type QueryEvent, type Verbosity, getVerbosity } from './types';
import { formatQuery, formatLifecycle, formatBanner } from './QueryStyler';

/** Global query event observer — adapters emit here, logger subscribes. */
export const queryObserver = new Observer<QueryEvent>();

/** Current verbosity level. */
let _verbosity: Verbosity = getVerbosity();

/** Override verbosity at runtime. */
export function setVerbosity(v: Verbosity): void {
  _verbosity = v;
}

/**
 * Initialize the logger system.
 * Called once when the DBMS middleware starts.
 * Builds the decorator chain and subscribes to the query observer.
 */
export function initLogger(activeSource: string): void {
  _verbosity = getVerbosity();

  // Build the ILogger decorator chain (libcpp style):
  //   ConsoleLogger → ColorDecorator → TimestampDecorator
  const logger = createLogger({
    minLevel: _verbosity === 'verbose' ? LogLevel.TRACE : LogLevel.INFO,
    timestamps: false,  // we handle timestamps in QueryStyler
    colors: false,      // we handle colors in QueryStyler
  });
  setGlobal(logger);

  // Subscribe to query events via Observer pattern
  queryObserver.subscribe('query', (evt: QueryEvent) => {
    const formatted = formatQuery(evt, _verbosity);
    // Write directly to stderr (bypasses Vite's console capture)
    process.stderr.write(formatted + '\n');
  });

  // Print startup banner
  process.stderr.write(formatBanner(activeSource, _verbosity === 'verbose'));
}

/** Emit a query event through the observer pipeline. */
export function emitQuery(
  source: string, operation: string,
  table: string, query: string, affected: number,
): void {
  const evt: QueryEvent = {
    ts: new Date(),
    source,
    operation: operation as QueryEvent['operation'],
    table,
    query,
    affected,
  };
  queryObserver.notify('query', evt);
}

/** Log a lifecycle message (source switch, startup, etc.). */
export function logLifecycle(message: string): void {
  process.stderr.write(formatLifecycle(message) + '\n');
}
