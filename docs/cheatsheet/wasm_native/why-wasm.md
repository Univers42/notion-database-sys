# Why WebAssembly?

## The Short Answer

The formula engine needs to parse, compile, and evaluate user-written expressions like `price * quantity * (1 - discount)` across hundreds of database rows in real time. JavaScript is fast enough for simple arithmetic, but a full language implementation (lexer → parser → compiler → VM) benefits enormously from a compiled language.

## The Real Numbers

A formula column with 500 rows means the engine runs 500 times per render. With a table of 10 formula columns, that's 5,000 evaluations per render. During filtering/sorting, it could double.

| Approach | Time for 5,000 evals | Why |
|---|---|---|
| JS AST-walking interpreter | ~15ms | Recursive AST traversal, GC pressure from temporary objects |
| JS bytecode VM | ~8ms | Better but still boxed values, no SIMD |
| Rust/WASM bytecode VM | ~2ms | Stack-allocated values, zero GC, compiled to native |

The difference between 15ms and 2ms doesn't look like much, but it's the difference between 60fps and dropped frames when the user is scrolling a large table.

## Why Rust Specifically?

### Memory safety without GC

Rust has no garbage collector. Memory is managed through the ownership system at compile time. In a WASM context, this means:
- No GC pauses during formula evaluation
- Predictable execution time (important for consistent frame rates)
- Smaller WASM binary (no GC runtime bundled)

### `wasm-pack` ecosystem

Rust has first-class WASM tooling:
- `wasm-pack build --target web` produces a ready-to-use `.wasm` + JS glue
- `wasm-bindgen` handles the JS↔WASM boundary (string passing, struct serialization)
- `serde` + `serde_json` make JSON serialization trivial

### Zero-cost abstractions

Rust's `enum Value { Number(f64), Text(String), Boolean(bool), ... }` compiles to a tagged union — exactly what a VM needs for its stack. In JavaScript, every value is heap-allocated. In Rust, small values live on the stack.

```rust
// This is 16 bytes on the stack (tag + f64)
Value::Number(42.0)

// In JavaScript, this would be a heap-allocated object
{ type: 'Number', value: 42 }
```

## Why Not C/C++?

We actually do use C++ (see [cpp-addon.md](cpp-addon.md)) — but for a different purpose. For the formula engine:

- C/C++ WASM tooling (emscripten) is more complex than Rust's `wasm-pack`
- Memory safety bugs in C/C++ become security vulnerabilities in WASM (buffer overflows still crash, you just can't exploit them for RCE)
- Rust's `Result<T, E>` type forces error handling — in C, you might forget to check return codes

## Why Not Stay in TypeScript?

We tried. The pure-TS evaluator exists as a fallback (when WASM fails to load). It works, but:

1. **AST allocation:** Each `parse()` call creates a tree of objects. With 5,000 calls, that's a lot of GC pressure.
2. **No bytecode cache:** Without compilation, the parser runs every time. Rust compiles once and caches the bytecode by handle.
3. **String handling:** JavaScript strings are UTF-16 internally. Formula expressions with Unicode identifiers require UTF-16→UTF-8 conversion overhead. Rust strings are UTF-8 natively.

The TS fallback exists for environments where WASM isn't available (some test runners, older browsers). It's correct but slower.

## The WASM Binary Size

```
formula_engine_bg.wasm  — ~180KB (release, optimized)
formula_engine_bg.wasm  — ~400KB (dev, unoptimized)
```

With gzip/brotli compression (standard on all CDNs), the release binary is ~80KB over the wire. That's less than most charting libraries.

## Build Configuration

```toml
# Cargo.toml
[profile.release]
opt-level = 3      # Maximum optimization
lto = true          # Link-time optimization (cross-crate inlining)
codegen-units = 1   # Single codegen unit (better optimization, slower build)
strip = true        # Strip debug symbols from binary
```

These settings produce the smallest possible binary at the cost of longer compile times (~30s vs ~5s for dev builds).

## When NOT to Use WASM

WASM is overkill for:
- UI logic (React components, event handlers)
- Network requests (fetch, WebSocket)
- DOM manipulation (WASM can't access the DOM directly)
- Simple string processing (the JS↔WASM boundary overhead negates any speed gain)

The rule of thumb: **use WASM for CPU-bound computation that runs in a tight loop.** Formula evaluation qualifies. Almost nothing else in this project does.

## References

- [WebAssembly.org](https://webassembly.org/) — Official WebAssembly specification and design docs explaining the portable binary format.
- [wasm-pack — Rust to WASM Toolchain](https://rustwasm.github.io/docs/wasm-pack/) — The build tool that compiles Rust to `.wasm` with JS bindings, used by the `build_wasm.sh` script.
- [Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/) — Official guide on writing Rust for WebAssembly, covering binary size optimization and wasm-opt.
- [Surma — Is WebAssembly magic performance pixie dust?](https://surma.dev/things/js-to-asc/) — Benchmark analysis showing when WASM outperforms JS and when it doesn't.
