// ─── Logger Types ────────────────────────────────────────────────────────────
// Port of libcpp/log/logger.hpp level enums & interfaces.

/** Log levels — mirrors libcpp::log::Level */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO  = 2,
  WARN  = 3,
  ERROR = 4,
  FATAL = 5,
}

/** Readable names per level (uppercase, fixed width). */
export const LEVEL_NAME: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]:  'INFO ',
  [LogLevel.WARN]:  'WARN ',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

/** DBMS operation types. */
export type OpType =
  | 'INSERT' | 'DELETE' | 'UPDATE'
  | 'ADD_COLUMN' | 'DROP_COLUMN' | 'ALTER_TYPE'
  | 'SELECT' | 'SOURCE_SWITCH' | 'STATE_LOAD';

/** A structured query event emitted by adapters. */
export interface QueryEvent {
  ts: Date;
  source: string;
  operation: OpType;
  table: string;
  query: string;
  affected: number;
}

/** Verbosity mode for the dev server. */
export type Verbosity = 'normal' | 'verbose';

/** Read verbosity from environment. */
export function getVerbosity(): Verbosity {
  return process.env.DBMS_VERBOSE === '1' ? 'verbose' : 'normal';
}
