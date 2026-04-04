# When to Write Native Code

A decision framework for choosing between TypeScript, Rust/WASM, and C++ in this project.

## The Decision Tree

```
Is it CPU-bound computation running in a tight loop?
├── No → TypeScript. Stop here.
└── Yes
    ├── Does it run in the browser?
    │   ├── Yes → Rust/WASM
    │   └── No (Node.js only)
    │       ├── Does it need the libftpp library features?
    │       │   ├── Yes → C++ native addon
    │       │   └── No → Still probably TypeScript (Node.js is fast enough)
    │       └── Is it a one-time operation (startup, build)?
    │           ├── Yes → TypeScript (startup cost doesn't matter)
    │           └── No → Consider Rust/WASM or C++ addon
    └── Is the overhead of the JS↔native boundary worth it?
        ├── < 1000 calls per render → Probably not. Stay in TS.
        └── > 1000 calls per render → Yes, go native.
```

## Real Examples from This Project

### Formula Engine → Rust/WASM ✓

- **CPU-bound?** Yes. Lexer + parser + compiler + VM for every formula cell.
- **Browser?** Yes (the formula column renders in the browser).
- **Tight loop?** Yes. 500 rows × 10 formula columns = 5,000 evaluations per render.
- **Decision:** Rust/WASM. The 3x speedup over TS is worth the WASM binary size.

### Query Logger → C++ Addon ✓

- **CPU-bound?** Not really. Logging is I/O-bound.
- **Browser?** No. Server-side only (Vite dev middleware).
- **Why C++ then?** The libftpp library provides Observer + TermWriter + ILogger which we needed for structured output. And it's a 42 School project requirement.
- **Decision:** C++ addon with graceful degradation.

### Filter Engine → TypeScript ✓

- **CPU-bound?** Mildly. Evaluates filter predicates per page.
- **Tight loop?** Medium. 500 pages × 3 filters = 1,500 evaluations.
- **Decision:** TypeScript. The filter predicates are simple comparisons (`contains`, `starts_with`, `is_before`). The overhead is negligible. Adding WASM would make the code harder to maintain for no measurable gain.

### SVG Path Computation → TypeScript ✓

- **CPU-bound?** Slightly. Trigonometry for donut slices.
- **Tight loop?** No. Typically 5-10 slices per chart.
- **Decision:** TypeScript. `Math.cos()` in JavaScript is already compiled to native by V8. WASM wouldn't be faster for simple math on small inputs.

### Cell Rendering → TypeScript ✓

- **CPU-bound?** No. DOM manipulation, React reconciliation.
- **Browser?** Yes, but WASM can't access the DOM.
- **Decision:** TypeScript. There's no alternative — WASM can't render React components.

## The Boundary Cost

Every call from JS to WASM has overhead:
- **String passing:** JS strings (UTF-16) must be encoded to UTF-8 and copied into WASM linear memory
- **JSON serialization:** ~0.01ms per typical object
- **Function call overhead:** ~0.001ms per call

For the formula engine with batch evaluation (one call for 500 rows), this overhead is amortized. For something that would make 500 individual WASM calls, each passing small data, the boundary overhead might exceed the computation time.

**Rule of thumb:** If the computation per call is less than 0.01ms, the boundary overhead dominates. Stay in TypeScript.

## Don't Reinvent the Wheel

The formula engine exists because Notion's formula system is a significant feature — it needs a proper language implementation (lexer, parser, compiler, VM). Building this from scratch is justified because:

1. **No existing library does exactly this.** Formula evaluators exist (math.js, expr-eval), but none match Notion's specific syntax and semantics.
2. **Performance matters.** Generic expression evaluators don't compile to bytecode or support handle caching.
3. **Educational value.** Implementing a compiler is instructive and directly relevant to the 42 curriculum.

For everything else, we use existing libraries:
- **React** instead of a custom UI framework
- **Zustand** instead of a custom state manager
- **Tailwind** instead of custom CSS utilities
- **Vite** instead of a custom bundler
- **Fastify** instead of a custom HTTP server
- **Mongoose** instead of raw MongoDB driver

The formula engine is the exception, not the rule. The rest of the project deliberately avoids reinventing the wheel.

## Summary Table

| Component | Language | Why |
|---|---|---|
| Formula evaluation | Rust/WASM | CPU-bound, 5K+ calls/render, browser-side |
| Query logging | C++ addon | 42 School project, Observer pattern, terminal output |
| Filter engine | TypeScript | Simple predicates, < 2K calls, no tight loop |
| SVG charts | TypeScript | Small input sizes, `Math.*` already native in V8 |
| Store logic | TypeScript | Not CPU-bound, needs React integration |
| API server | TypeScript | I/O-bound, not CPU-bound |
| Database adapters | TypeScript | I/O-bound (network/disk), easy to maintain |

## References

- [WebAssembly.org — Use Cases](https://webassembly.org/docs/use-cases/) — Official WebAssembly documentation on when WASM provides performance advantages over JavaScript.
- [Surma — Is WebAssembly magic performance pixie dust?](https://surma.dev/things/js-to-asc/) — Empirical benchmarks comparing JS vs WASM for various workload types, supporting the decision tree.
- [Node.js — Node-API](https://nodejs.org/api/n-api.html) — When to choose C++ native addons over WASM (server-side only, needs OS-level APIs).
- [wasm-bindgen — Performance](https://rustwasm.github.io/docs/wasm-bindgen/reference/performance.html) — Analysis of the JS↔WASM boundary cost that determines the minimum workload size for WASM to be worthwhile.
