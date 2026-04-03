// ─── TypeScript declarations for the libcpp_logger native addon ──────────────
// Built from src/server/logger/native/binding.cpp via cmake-js.
//
// The addon bridges to the real C++ libcpp library:
//   core::Observer<string>  — event subscription (void callbacks)
//   log::ILogger chain      — ConsoleLogger → LogColorDecorator → TimestampDecorator
//   TermStyle + TermWriter  — dracula-themed terminal rendering to stderr
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize the C++ logger system.
 *
 * Builds the ILogger decorator chain, creates a TermWriter → stderr
 * with StyleSheet::dracula(), registers per-operation callout styles,
 * subscribes the formatting callback to the Observer, and prints
 * a startup banner.
 *
 * Must be called once before any other function.
 */
export function init(source: string, verbose: boolean): void;

/**
 * Log a DBMS query event.
 *
 * Stores event data in shared C++ state, then fires
 * Observer<string>::notify("query").  The C++ subscriber
 * formats the output and writes directly to stderr — never
 * bounces back through JS.
 *
 * In verbose mode: TermWriter callout (colored box per operation type).
 * In normal mode:  compact one-liner via ILogger decorator chain.
 */
export function logQuery(
  source: string,
  operation: string,
  table: string,
  query: string,
  affected: number,
): void;

/**
 * Log a lifecycle message (source switch, startup, shutdown, …).
 *
 * Writes through the global ILogger (TimestampDecorator → LogColorDecorator
 * → ConsoleLogger) at INFO level.
 */
export function logLifecycle(message: string): void;

/**
 * Change verbosity at runtime.
 *
 * - `true`  → verbose (TermWriter callouts, TRACE-level logger)
 * - `false` → normal  (compact one-liners, INFO-level logger)
 */
export function setVerbosity(verbose: boolean): void;
