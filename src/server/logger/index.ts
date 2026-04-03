/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 14:52:49 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { createRequire } from 'node:module';


export type OpType =
  | 'INSERT' | 'DELETE' | 'UPDATE'
  | 'ADD_COLUMN' | 'DROP_COLUMN' | 'ALTER_TYPE'
  | 'SELECT' | 'SOURCE_SWITCH' | 'STATE_LOAD';

export type Verbosity = 'normal' | 'verbose';

export function getVerbosity(): Verbosity {
  return process.env.DBMS_VERBOSE === '1' ? 'verbose' : 'normal';
}


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
