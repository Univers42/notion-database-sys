// ─── Logger — port of libcpp/log/logger.hpp ──────────────────────────────────
// ILogger interface + ConsoleLogger + Decorator chain.
// Mirrors the libcpp decorator pattern: TimestampDecorator(ColorDecorator(ConsoleLogger)).

import { LogLevel, LEVEL_NAME } from './types';
import { Palette } from './theme';

// ─── ANSI helpers (local, minimal) ───────────────────────────────────────────
const ESC = '\x1b[';
const RST = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM  = `${ESC}2m`;

function fg24(hex: string): string {
  const h = hex.replace('#', '');
  return `${ESC}38;2;${parseInt(h.slice(0, 2), 16)};${parseInt(h.slice(2, 4), 16)};${parseInt(h.slice(4, 6), 16)}m`;
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  [LogLevel.TRACE]: fg24(Palette.muted),
  [LogLevel.DEBUG]: fg24(Palette.cyan),
  [LogLevel.INFO]:  fg24(Palette.green),
  [LogLevel.WARN]:  fg24(Palette.yellow),
  [LogLevel.ERROR]: fg24(Palette.red),
  [LogLevel.FATAL]: fg24(Palette.red) + BOLD,
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ILogger — abstract interface (mirrors libcpp::log::ILogger)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ILogger {
  log(level: LogLevel, msg: string): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ConsoleLogger — base logger, writes to stderr
//  Port of libcpp::log::ConsoleLogger
// ═══════════════════════════════════════════════════════════════════════════════

export class ConsoleLogger implements ILogger {
  private _minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this._minLevel = minLevel;
  }

  log(level: LogLevel, msg: string): void {
    if (level < this._minLevel) return;
    process.stderr.write(msg + '\n');
  }

  setMinLevel(level: LogLevel): void { this._minLevel = level; }
  minLevel(): LogLevel { return this._minLevel; }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NullLogger — discards all messages
//  Port of libcpp::log::NullLogger
// ═══════════════════════════════════════════════════════════════════════════════

export class NullLogger implements ILogger {
  log(_level: LogLevel, _msg: string): void { /* discard */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TimestampDecorator — prepends timestamp  (decorator pattern)
//  Port of libcpp::log::TimestampDecorator
// ═══════════════════════════════════════════════════════════════════════════════

export class TimestampDecorator implements ILogger {
  private _inner: ILogger;

  constructor(inner: ILogger) {
    this._inner = inner;
  }

  log(level: LogLevel, msg: string): void {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const ts = `${fg24(Palette.muted)}${DIM}${hh}:${mm}:${ss}.${ms}${RST}`;
    this._inner.log(level, `${ts} ${msg}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ColorDecorator — prepends colored level badge  (decorator pattern)
//  Port of libcpp::log::LogColorDecorator
// ═══════════════════════════════════════════════════════════════════════════════

export class ColorDecorator implements ILogger {
  private _inner: ILogger;

  constructor(inner: ILogger) {
    this._inner = inner;
  }

  log(level: LogLevel, msg: string): void {
    const color = LEVEL_COLOR[level];
    const name = LEVEL_NAME[level];
    const badge = `${color}${BOLD}[${name}]${RST}`;
    this._inner.log(level, `${badge} ${msg}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PrefixDecorator — prepends a fixed prefix string  (decorator pattern)
// ═══════════════════════════════════════════════════════════════════════════════

export class PrefixDecorator implements ILogger {
  private _inner: ILogger;
  private _prefix: string;

  constructor(inner: ILogger, prefix: string) {
    this._inner = inner;
    this._prefix = prefix;
  }

  log(level: LogLevel, msg: string): void {
    this._inner.log(level, `${this._prefix} ${msg}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Global logger singleton — mirrors libcpp::log::set_global / global()
// ═══════════════════════════════════════════════════════════════════════════════

let _global: ILogger = new ConsoleLogger();

/** Replace the global logger instance. */
export function setGlobal(logger: ILogger): void {
  _global = logger;
}

/** Access the global logger. */
export function global(): ILogger {
  return _global;
}

// ─── Factory: build a decorated logger chain ─────────────────────────────────

export interface LoggerOptions {
  minLevel?: LogLevel;
  timestamps?: boolean;
  colors?: boolean;
  prefix?: string;
}

/**
 * Build a fully-decorated logger chain in libcpp style:
 *   Prefix? → Timestamp? → Color? → ConsoleLogger
 * Each decorator wraps the previous, just like the C++ version.
 */
export function createLogger(opts: LoggerOptions = {}): ILogger {
  let logger: ILogger = new ConsoleLogger(opts.minLevel ?? LogLevel.TRACE);

  if (opts.colors !== false) {
    logger = new ColorDecorator(logger);
  }
  if (opts.timestamps !== false) {
    logger = new TimestampDecorator(logger);
  }
  if (opts.prefix) {
    logger = new PrefixDecorator(logger, opts.prefix);
  }

  return logger;
}
