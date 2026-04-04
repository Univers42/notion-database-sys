// ─── Logger System — N-API bridge to libcpp ──────────────────────────────────
// Loads the native C++ addon that provides the full libcpp pipeline:
//
//   JS call ──► N-API ──► C++ Observer<string>::notify("query")
//                              │
//                              ▼  (C++ subscriber callback)
//                         TermWriter + StyleSheet::dracula() ──► stderr
//
// The entire formatting pipeline runs in C++ — only the trigger crosses
// the JS/C++ boundary.  The Logger decorator chain (ConsoleLogger →
// LogColorDecorator → TimestampDecorator) handles compact one-liners;
// TermWriter callouts handle the verbose boxed display.
// ─────────────────────────────────────────────────────────────────────────────

import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// ─── Types (kept on TS side for query-log ring buffer / REST API) ────────────
export type OpType =
  | 'INSERT' | 'DELETE' | 'UPDATE'
  | 'ADD_COLUMN' | 'DROP_COLUMN' | 'ALTER_TYPE'
  | 'SELECT' | 'SOURCE_SWITCH' | 'STATE_LOAD';

export type Verbosity = 'normal' | 'verbose';

export function getVerbosity(): Verbosity {
  return process.env.DBMS_VERBOSE === '1' ? 'verbose' : 'normal';
}

// ─── Load the native addon ──────────────────────────────────────────────────
// The .node binary is compiled by cmake-js into native/build/Release/.
// We use createRequire so ESM / Vite SSR can resolve the binary.

interface NativeLogger {
  init(source: string, verbose: boolean): void;
  logQuery(source: string, op: string, table: string, query: string, affected: number): void;
  logLifecycle(message: string): void;
  setVerbosity(verbose: boolean): void;
}

const require = createRequire(import.meta.url);
let native: NativeLogger;

try {
  native = require('./native/build/Release/libcpp_logger.node') as NativeLogger;
} catch (err) {
  // Graceful fallback: if the native addon isn't built, log a warning and
  // provide a no-op implementation so the dev server still starts.
  process.stderr.write(
    '\x1b[33m[logger] native addon not found — run `make build-native` first\x1b[0m\n'
    + `         ${(err as Error).message}\n`,
  );
  native = {
    init: () => {},
    logQuery: () => {},
    logLifecycle: (msg: string) => { process.stderr.write(`[lifecycle] ${msg}\n`); },
    setVerbosity: () => {},
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize the C++ logger system.
 * Called once when the DBMS middleware starts.
 */
export function initLogger(activeSource: string): void {
  const verbose = getVerbosity() === 'verbose';
  native.init(activeSource, verbose);
}

/**
 * Emit a query event through the C++ Observer pipeline.
 * Observer<string>::notify("query") fires the subscriber callback which
 * formats via TermWriter/ILogger and writes directly to stderr.
 */
export function emitQuery(
  source: string, operation: string,
  table: string, query: string, affected: number,
): void {
  native.logQuery(source, operation, table, query, affected);
}

/** Log a lifecycle message through the C++ ILogger decorator chain. */
export function logLifecycle(message: string): void {
  native.logLifecycle(message);
}

/** Change verbosity at runtime. */
export function setVerbosity(v: Verbosity): void {
  native.setVerbosity(v === 'verbose');
}
