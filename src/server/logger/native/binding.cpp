// ─── N-API binding for libcpp logger/observer/term ───────────────────────────
// Exposes the real C++ Observer, Logger decorator chain, and TermWriter to Node.
//
// Architecture (runs entirely in C++ — only the trigger crosses the JS/C++ boundary):
//
//   JS: logQuery(source, op, table, query, affected)
//        │
//        ▼  (N-API call)
//   C++: store event data → Observer<string>::notify("query")
//        │
//        ▼  (C++ subscriber callback, registered in init())
//   C++: format with TermWriter/TermStyle + StyleSheet::dracula()
//        │
//        ▼
//   C++: std::cerr <<  (direct terminal output, never bounces back to JS)
//
// ─────────────────────────────────────────────────────────────────────────────

#include <napi.h>
#include <sstream>
#include <string>
#include <ctime>
#include <vector>

#include "libcpp/core/observer.hpp"
#include "libcpp/log/logger.hpp"
#include "libcpp/log/macros.hpp"
#include "libcpp/term/color.hpp"
#include "libcpp/term/style.hpp"
#include "libcpp/term/stylesheet.hpp"
#include "libcpp/term/writer.hpp"

using namespace libcpp;

// ═══════════════════════════════════════════════════════════════════════════════
//  Global state — lives for the lifetime of the Node.js process
// ═══════════════════════════════════════════════════════════════════════════════

static core::Observer<std::string>*  g_observer = nullptr;
static TermStyle*                     g_style    = nullptr;
static TermWriter*                    g_writer   = nullptr;
static log::ConsoleLogger*            g_console  = nullptr;
static log::TimestampDecorator*       g_ts_dec   = nullptr;
static log::LogColorDecorator*        g_clr_dec  = nullptr;
static bool                           g_verbose  = false;

// Shared event data — set before notify(), read by the subscriber callback.
// This mirrors the libcpp Observer<TEvent> pattern where TEvent identifies
// the event key and the payload is carried via shared state.
static struct {
  std::string source;
  std::string operation;
  std::string table;
  std::string query;
  int         affected;
} g_event;

// ═══════════════════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════════════════

static std::string timestamp_hms() {
  std::time_t now = std::time(nullptr);
  char buf[32];
  std::strftime(buf, sizeof(buf), "%H:%M:%S", std::localtime(&now));
  return std::string(buf);
}

/** Split a string by newlines. */
static std::vector<std::string> split_lines(const std::string& s) {
  std::vector<std::string> lines;
  std::istringstream iss(s);
  std::string line;
  while (std::getline(iss, line)) lines.push_back(line);
  return lines;
}

/** Find the first non-comment line of a query. */
static std::string first_meaningful_line(const std::string& query, size_t max_len = 60) {
  auto lines = split_lines(query);
  for (const auto& l : lines) {
    size_t pos = l.find_first_not_of(" \t");
    if (pos == std::string::npos) continue;
    if (l[pos] == '/' || l[pos] == '-') continue;
    if (l.size() > max_len) return l.substr(0, max_len) + "…";
    return l;
  }
  if (!lines.empty()) {
    if (lines[0].size() > max_len) return lines[0].substr(0, max_len) + "…";
    return lines[0];
  }
  return "";
}

/** Map an operation string to a callout type name. */
static std::string op_to_callout(const std::string& op) {
  if (op == "INSERT" || op == "ADD_COLUMN") return "query_insert";
  if (op == "DELETE" || op == "DROP_COLUMN") return "query_delete";
  if (op == "UPDATE")                       return "query_update";
  if (op == "ALTER_TYPE")                   return "query_alter";
  return "query_select";
}

/** Map an operation to a log level. */
static log::Level op_to_level(const std::string& op) {
  if (op == "DELETE" || op == "DROP_COLUMN") return log::LWARN;
  return log::LINFO;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Observer subscriber: formats and writes query events
//  This is the C++ callback that fires when g_observer->notify("query") is called.
// ═══════════════════════════════════════════════════════════════════════════════

static void on_query_event() {
  if (g_verbose) {
    // ── Verbose mode: use TermWriter callout for boxed display ──

    std::string callout_type = op_to_callout(g_event.operation);
    std::string header = g_event.operation + " " + g_event.table;

    // Build body lines: meta, query, affected
    std::string meta = "[" + g_event.source + "]  " + timestamp_hms();
    auto qlines = split_lines(g_event.query);
    std::string affected_str = "→ " + std::to_string(g_event.affected)
      + " row" + (g_event.affected != 1 ? "s" : "");

    // TermWriter::callout takes up to 10 lines after the header
    // Layout: header | meta | query lines... | affected
    std::string lines[10];
    lines[0] = meta;
    int count = 1;
    for (size_t i = 0; i < qlines.size() && count < 9; ++i) {
      lines[count++] = qlines[i];
    }
    lines[count++] = affected_str;

    g_writer->callout(callout_type, header,
                      count > 0 ? lines[0] : "",
                      count > 1 ? lines[1] : "",
                      count > 2 ? lines[2] : "",
                      count > 3 ? lines[3] : "",
                      count > 4 ? lines[4] : "",
                      count > 5 ? lines[5] : "",
                      count > 6 ? lines[6] : "",
                      count > 7 ? lines[7] : "",
                      count > 8 ? lines[8] : "");
    g_writer->nl();
  } else {
    // ── Normal mode: compact one-liner via ILogger decorator chain ──

    std::string firstLine = first_meaningful_line(g_event.query);
    std::string msg = "[" + g_event.source + "] "
      + g_event.operation + " " + g_event.table;
    if (!firstLine.empty()) msg += " → " + firstLine;
    msg += " (" + std::to_string(g_event.affected)
      + " row" + (g_event.affected != 1 ? "s" : "") + ")";

    log::Level level = op_to_level(g_event.operation);
    log::global().log(level, msg);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Register custom callout styles for each operation type
// ═══════════════════════════════════════════════════════════════════════════════

static void register_query_callouts() {
  // INSERT — green
  {
    ElemStyle e;
    e.fg     = Srgb(80, 250, 123);
    e.bg     = Srgb(11, 41, 20);
    e.border = Srgb(80, 250, 123);
    e.glyph  = Glyph::CHECK;
    e.has_bg = true;
    e.font   = FONT_NONE;
    e.width  = 68;
    e.pad_l  = 1; e.pad_r = 1; e.margin_l = 1;
    g_writer->define_callout("query_insert", e);
  }
  // UPDATE — cyan
  {
    ElemStyle e;
    e.fg     = Srgb(139, 233, 253);
    e.bg     = Srgb(11, 30, 41);
    e.border = Srgb(139, 233, 253);
    e.glyph  = Glyph::TRIANGLE;
    e.has_bg = true;
    e.font   = FONT_NONE;
    e.width  = 68;
    e.pad_l  = 1; e.pad_r = 1; e.margin_l = 1;
    g_writer->define_callout("query_update", e);
  }
  // DELETE — red
  {
    ElemStyle e;
    e.fg     = Srgb(255, 85, 85);
    e.bg     = Srgb(41, 11, 11);
    e.border = Srgb(255, 85, 85);
    e.glyph  = Glyph::CROSS;
    e.has_bg = true;
    e.font   = FONT_NONE;
    e.width  = 68;
    e.pad_l  = 1; e.pad_r = 1; e.margin_l = 1;
    g_writer->define_callout("query_delete", e);
  }
  // ALTER — purple
  {
    ElemStyle e;
    e.fg     = Srgb(189, 147, 249);
    e.bg     = Srgb(25, 11, 41);
    e.border = Srgb(189, 147, 249);
    e.glyph  = Glyph::DIAMOND;
    e.has_bg = true;
    e.font   = FONT_NONE;
    e.width  = 68;
    e.pad_l  = 1; e.pad_r = 1; e.margin_l = 1;
    g_writer->define_callout("query_alter", e);
  }
  // SELECT / meta — yellow
  {
    ElemStyle e;
    e.fg     = Srgb(241, 250, 140);
    e.bg     = Srgb(35, 35, 11);
    e.border = Srgb(241, 250, 140);
    e.glyph  = Glyph::CHAIN;
    e.has_bg = true;
    e.font   = FONT_NONE;
    e.width  = 68;
    e.pad_l  = 1; e.pad_r = 1; e.margin_l = 1;
    g_writer->define_callout("query_select", e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Exported N-API functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * init(source: string, verbose: boolean) → void
 *
 * Initialize the logger system:
 * 1. Build the ILogger decorator chain (ConsoleLogger → LogColorDecorator → TimestampDecorator)
 * 2. Set it as the global logger
 * 3. Create TermStyle + apply dracula() theme
 * 4. Create TermWriter targeting std::cerr
 * 5. Register custom callouts per operation type
 * 6. Subscribe the formatting callback to the Observer
 */
static Napi::Value Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "init(source, verbose) expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string source = info[0].As<Napi::String>().Utf8Value();
  g_verbose = info[1].As<Napi::Boolean>().Value();

  // ── 1. ILogger decorator chain ──
  g_console = new log::ConsoleLogger();
  g_console->set_min_level(g_verbose ? log::LTRACE : log::LINFO);
  g_clr_dec = new log::LogColorDecorator(g_console);
  g_ts_dec  = new log::TimestampDecorator(g_clr_dec);
  log::set_global(g_ts_dec);

  // ── 2. TermStyle + dracula theme ──
  g_style = new TermStyle();
  StyleSheet ss = StyleSheet::dracula();
  ss.apply(*g_style);

  // ── 3. TermWriter → std::cerr ──
  g_writer = new TermWriter(*g_style, std::cerr);

  // Apply dracula stylesheet callouts (tip, note, warning, danger, …)
  ss.apply_callouts(*g_writer);

  // ── 4. Register query operation callouts (custom per-op-type) ──
  register_query_callouts();

  // ── 5. Observer + subscriber ──
  g_observer = new core::Observer<std::string>();
  (void)g_observer->subscribe("query", on_query_event);

  // ── 6. Print startup banner ──
  g_writer->sep();
  g_writer->h2("DBMS Query Logger");
  g_writer->info("source: " + source + "  |  mode: "
                 + std::string(g_verbose ? "verbose" : "normal"));
  g_writer->dim("powered by libcpp — Observer + Logger decorators + TermWriter");
  g_writer->sep();
  g_writer->nl();

  return env.Undefined();
}

/**
 * logQuery(source, operation, table, query, affected) → void
 *
 * Store event data in shared state, then fire Observer::notify("query").
 * The C++ subscriber callback (on_query_event) formats and writes to stderr.
 */
static Napi::Value LogQuery(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!g_observer || info.Length() < 5) return env.Undefined();

  g_event.source    = info[0].As<Napi::String>().Utf8Value();
  g_event.operation = info[1].As<Napi::String>().Utf8Value();
  g_event.table     = info[2].As<Napi::String>().Utf8Value();
  g_event.query     = info[3].As<Napi::String>().Utf8Value();
  g_event.affected  = info[4].As<Napi::Number>().Int32Value();

  // Fire the Observer — this triggers C++ on_query_event()
  g_observer->notify("query");

  return env.Undefined();
}

/**
 * logLifecycle(message: string) → void
 *
 * Log a lifecycle message through the ILogger decorator chain.
 */
static Napi::Value LogLifecycle(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1) return env.Undefined();

  std::string msg = info[0].As<Napi::String>().Utf8Value();
  log::global().log(log::LINFO, msg);

  return env.Undefined();
}

/**
 * setVerbosity(verbose: boolean) → void
 *
 * Change verbosity at runtime (e.g., on source switch).
 */
static Napi::Value SetVerbosity(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1) return env.Undefined();

  g_verbose = info[0].As<Napi::Boolean>().Value();
  if (g_console) {
    g_console->set_min_level(g_verbose ? log::LTRACE : log::LINFO);
  }

  return env.Undefined();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Module registration
// ═══════════════════════════════════════════════════════════════════════════════

static Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
  exports.Set("init",          Napi::Function::New(env, Init));
  exports.Set("logQuery",      Napi::Function::New(env, LogQuery));
  exports.Set("logLifecycle",  Napi::Function::New(env, LogLifecycle));
  exports.Set("setVerbosity",  Napi::Function::New(env, SetVerbosity));
  return exports;
}

NODE_API_MODULE(libcpp_logger, InitModule)
