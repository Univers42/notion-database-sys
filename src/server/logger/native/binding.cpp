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
#include <chrono>
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
//  Dracula palette — per-part ANSI coloring for rich normal-mode output
// ═══════════════════════════════════════════════════════════════════════════════

static const std::string RST   = "\033[0m";
static const std::string BOLD  = "\033[1m";
static const std::string DIM_A = "\033[2m";
static const std::string ITAL  = "\033[3m";

struct OpDisplay {
  Srgb        color;
  std::string glyph;
};

static OpDisplay op_display(const std::string& op) {
  if (op == "INSERT" || op == "ADD_COLUMN")
    return { Srgb(80, 250, 123),  Glyph::CHECK };
  if (op == "UPDATE")
    return { Srgb(139, 233, 253), Glyph::TRIANGLE };
  if (op == "DELETE" || op == "DROP_COLUMN")
    return { Srgb(255, 85, 85),   Glyph::CROSS };
  if (op == "ALTER_TYPE")
    return { Srgb(189, 147, 249), Glyph::DIAMOND };
  return   { Srgb(241, 250, 140), Glyph::CHAIN };
}

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

/** Map operation to its callout registration name (verbose mode). */
static std::string op_to_callout_name(const std::string& op) {
  if (op == "ADD_COLUMN")  return "INSERT";
  if (op == "DROP_COLUMN") return "DELETE";
  return op;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Observer subscriber: formats and writes query events
//  This is the C++ callback that fires when g_observer->notify("query") is called.
// ═══════════════════════════════════════════════════════════════════════════════

static void on_query_event() {
  OpDisplay od = op_display(g_event.operation);

  if (g_verbose) {
    // ── Verbose mode: use TermWriter callout with clean operation names ──

    std::string callout_name = op_to_callout_name(g_event.operation);

    // l1: table + meta on one line
    std::string l1 = g_event.table
      + "   [" + g_event.source + " · " + timestamp_hms() + "]";
    // If the callout name differs from the raw op, show the raw op
    if (callout_name != g_event.operation)
      l1 = g_event.operation + " · " + l1;

    auto qlines = split_lines(g_event.query);
    std::string affected_str = "→ " + std::to_string(g_event.affected)
      + " row" + (g_event.affected != 1 ? "s" : "");

    // Pack body: l1(meta) + query lines + affected
    std::string body[10];
    body[0] = l1;
    int n = 1;
    for (size_t i = 0; i < qlines.size() && n < 8; ++i)
      body[n++] = qlines[i];
    body[n++] = affected_str;

    g_writer->callout(callout_name,
                      n > 0 ? body[0] : "",
                      n > 1 ? body[1] : "",
                      n > 2 ? body[2] : "",
                      n > 3 ? body[3] : "",
                      n > 4 ? body[4] : "",
                      n > 5 ? body[5] : "",
                      n > 6 ? body[6] : "",
                      n > 7 ? body[7] : "",
                      n > 8 ? body[8] : "");
    g_writer->nl();

  } else {
    // ── Normal mode: rich ANSI-colored line via TermWriter ─────────────
    //
    //  ✔ INSERT tasks → INSERT INTO tasks VALUES (1)  (1 row)  json · 18:01
    //  │  │      │       │                             │        └ dim/italic
    //  │  │      │       │                             └ dim
    //  │  │      │       └ foreground
    //  │  │      └ bold white
    //  │  └ bold in op-color
    //  └ glyph in op-color

    std::string oc = od.color.to_ansi_fg();
    std::string fc = Srgb(248, 248, 242).to_ansi_fg();
    std::string dc = Srgb(98, 114, 164).to_ansi_fg();
    std::string firstLine = first_meaningful_line(g_event.query);
    std::string rows = std::to_string(g_event.affected)
      + " row" + (g_event.affected != 1 ? "s" : "");

    std::string line;
    line += " " + oc + od.glyph + BOLD + g_event.operation + RST;
    line += " " + fc + BOLD + g_event.table + RST;
    if (!firstLine.empty())
      line += " " + dc + "→" + RST + " " + fc + firstLine + RST;
    line += "  " + dc + DIM_A + "(" + rows + ")" + RST;
    line += "  " + dc + DIM_A + ITAL + g_event.source + " · "
         + timestamp_hms() + RST;

    g_writer->write_raw(line + "\n");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Register custom callout styles for each operation type
// ═══════════════════════════════════════════════════════════════════════════════

static void register_query_callouts() {
  // Helper — all callouts share the same layout, only colors/glyph change
  auto make = [](const Srgb& fg, const Srgb& bg_tint,
                 const std::string& glyph) {
    ElemStyle e;
    e.fg     = fg;
    e.bg     = bg_tint;
    e.border = fg;
    e.glyph  = glyph;
    e.has_bg = true;
    e.font   = FONT_NONE;
    e.width  = 72;
    e.pad_l  = 1; e.pad_r = 1; e.margin_l = 2;
    return e;
  };

  // Register with the operation name as key — so callout headers
  // show "INSERT", "UPDATE", etc. instead of internal names.
  g_writer->define_callout("INSERT",
    make(Srgb(80,250,123),  Srgb(11,41,20),  Glyph::CHECK));
  g_writer->define_callout("UPDATE",
    make(Srgb(139,233,253), Srgb(11,30,41),  Glyph::TRIANGLE));
  g_writer->define_callout("DELETE",
    make(Srgb(255,85,85),   Srgb(41,11,11),  Glyph::CROSS));
  g_writer->define_callout("ALTER_TYPE",
    make(Srgb(189,147,249), Srgb(25,11,41),  Glyph::DIAMOND));
  g_writer->define_callout("SELECT",
    make(Srgb(241,250,140), Srgb(35,35,11),  Glyph::CHAIN));
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
 * Log a lifecycle message via TermWriter info style.
 * Deduplicates rapid identical messages (e.g. React StrictMode double-calls).
 */
static std::string g_last_lifecycle;
static std::chrono::steady_clock::time_point g_last_lifecycle_ts;

static Napi::Value LogLifecycle(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1) return env.Undefined();

  std::string msg = info[0].As<Napi::String>().Utf8Value();

  // Suppress duplicates within 500ms
  auto now = std::chrono::steady_clock::now();
  auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
    now - g_last_lifecycle_ts).count();
  if (msg == g_last_lifecycle && elapsed < 500)
    return env.Undefined();
  g_last_lifecycle = msg;
  g_last_lifecycle_ts = now;

  // Use TermWriter info style (dracula cyan ℹ) for rich themed output
  g_writer->info(msg);

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
