# Formula Pipeline: Lexer → Parser → Compiler → VM

The formula engine turns a string like `if(price > 100, "expensive", "cheap")` into a result. Here's each stage.

## Stage 1: Lexer (`src/lexer.rs`)

Converts raw text into tokens.

```
Input:  "price * quantity + 10"
Output: [Ident("price"), Star, Ident("quantity"), Plus, Number(10.0), Eof]
```

The lexer handles:
- **Numbers:** integers, floats, scientific notation (`1e3`)
- **Strings:** double-quoted (`"hello"`) with escape sequences
- **Identifiers:** property names (`price`, `first_name`)
- **Operators:** `+ - * / % ^ = != < > <= >= && ||`
- **Whitespace:** consumed but not emitted (insignificant)
- **Position tracking:** each token carries line/column for error messages

```rust
fn next_token(&mut self) -> Token {
    self.skip_whitespace();
    match self.current_char() {
        '+' => { self.advance(); Token::Plus }
        '-' => { self.advance(); Token::Minus }
        '*' => { self.advance(); Token::Star }
        '0'..='9' => self.read_number(),
        '"' => self.read_string(),
        'a'..='z' | 'A'..='Z' | '_' => self.read_identifier(),
        _ => Token::Error(format!("Unexpected character: {}", self.current_char())),
    }
}
```

## Stage 2: Parser (`src/parser.rs`)

Converts tokens into an AST using **Pratt parsing** (precedence climbing).

```
Input:  [Ident("price"), Star, Ident("quantity"), Plus, Number(10.0)]
Output: Add(
           Mul(Prop("price"), Prop("quantity")),
           Literal(10.0)
         )
```

### Why Pratt Parsing?

Traditional recursive descent parsers need one function per precedence level (7+ functions for a typical expression grammar). Pratt parsing uses one function with a precedence table:

```rust
fn parse_expr(&mut self, min_precedence: u8) -> Expr {
    let mut left = self.parse_prefix();  // Handle unary ops, literals, parentheses

    while self.current_precedence() >= min_precedence {
        let op = self.current_token();
        let prec = self.current_precedence();
        self.advance();
        let right = self.parse_expr(prec + 1);  // +1 for left-associativity
        left = Expr::Binary(op, Box::new(left), Box::new(right));
    }

    left
}
```

The precedence table:
```rust
fn precedence(token: &Token) -> u8 {
    match token {
        Token::Or       => 1,
        Token::And      => 2,
        Token::Eq | Token::Neq => 3,
        Token::Lt | Token::Gt | Token::Lte | Token::Gte => 4,
        Token::Plus | Token::Minus => 5,
        Token::Star | Token::Slash | Token::Percent => 6,
        Token::Caret    => 7,  // Power (right-associative: prec stays at 7)
        _ => 0,
    }
}
```

### Special Cases

- **Function calls:** `if(condition, then, else)` → `Expr::Call("if", [condition, then, else])`
- **Property access:** `prop("name")` → `Expr::Prop("name")`
- **Lambdas:** `map(list, x => x * 2)` → `Expr::Lambda(["x"], body)`
- **Power operator:** Right-associative (`2^3^4` = `2^(3^4)`, not `(2^3)^4`)

## Stage 3: Compiler (`src/compiler.rs`)

Walks the AST and emits bytecode into a `Chunk`:

```rust
struct Chunk {
    code: Vec<OpCode>,       // Bytecode instructions
    constants: Vec<Value>,   // Constant pool (numbers, strings)
    strings: Vec<String>,    // String pool (property names)
}
```

```
AST:   Add(Mul(Prop("price"), Prop("quantity")), Literal(10.0))

Bytecode:
  0: LoadProp(0)        // Push props["price"]   (strings[0] = "price")
  1: LoadProp(1)        // Push props["quantity"] (strings[1] = "quantity")
  2: Mul                // Pop 2, push product
  3: Constant(0)        // Push 10.0             (constants[0] = 10.0)
  4: Add                // Pop 2, push sum
  5: Return             // Return top of stack
```

### The OpCode Enum

```rust
pub enum OpCode {
    Constant(usize),      // Push from constant pool
    Add, Sub, Mul, Div,   // Arithmetic
    Mod, Pow, Negate,     // More arithmetic
    Eq, Neq, Lt, Gt,     // Comparison
    Lte, Gte,
    And, Or, Not,         // Logic
    JumpIfFalse(usize),  // Conditional jump (for if/and/or short-circuit)
    Jump(usize),          // Unconditional jump
    GetLocal(usize),      // Read local variable
    SetLocal(usize),      // Write local variable
    LoadProp(usize),      // Load property by string pool index
    CallBuiltin(usize, u8), // Call built-in function (index, arg count)
    MakeClosure(usize, u8), // Create closure (chunk index, arity)
    CallClosure(u8),      // Call closure (arg count)
    Return,               // Return top of stack
}
```

### Why Bytecode over AST Walking?

```
AST walking:  interpret(node) → match type → recursively interpret children
              Each node is a heap-allocated enum + Box pointers → cache misses

Bytecode VM:  ip++ → match opcode → push/pop stack
              Linear array traversal → cache-friendly
```

Bytecode is ~3x faster than AST walking for repeated evaluation because:
1. No recursive function calls (just a loop with a match)
2. No pointer chasing (opcodes are contiguous in memory)
3. Constants are pre-resolved (no name lookups during evaluation)

## Stage 4: VM (`src/vm.rs`)

A stack-based virtual machine. All values live on a stack. Instructions push and pop.

```rust
pub fn execute(&mut self, chunk: &Chunk, ctx: &EvalContext) -> Result<Value> {
    self.stack.clear();
    let mut ip = 0;  // Instruction pointer

    loop {
        match &chunk.code[ip] {
            OpCode::Constant(idx) => {
                self.stack.push(chunk.constants[*idx].clone());
            }
            OpCode::Add => {
                let b = self.stack.pop().unwrap();
                let a = self.stack.pop().unwrap();
                self.stack.push(add_values(a, b));
            }
            OpCode::LoadProp(idx) => {
                let name = &chunk.strings[*idx];
                let val = ctx.get_prop(name).unwrap_or(Value::Empty);
                self.stack.push(val);
            }
            OpCode::JumpIfFalse(target) => {
                if !self.stack.last().unwrap().is_truthy() {
                    ip = *target;
                    continue;
                }
            }
            OpCode::Return => return Ok(self.stack.pop().unwrap_or(Value::Empty)),
            // ... more opcodes
        }
        ip += 1;
    }
}
```

### Safety Limits

```rust
const MAX_STACK_SIZE: usize = 10_000;
const MAX_CALL_DEPTH: usize = 256;
```

These prevent:
- Stack overflow from deeply nested expressions
- Infinite recursion from recursive lambdas
- Memory exhaustion from malicious formulas

### Null Propagation

```rust
fn add_values(a: Value, b: Value) -> Value {
    match (a, b) {
        (Value::Number(a), Value::Number(b)) => Value::Number(a + b),
        (Value::Text(a), Value::Text(b)) => Value::Text(format!("{}{}", a, b)),
        (Value::Empty, _) | (_, Value::Empty) => Value::Empty,
        _ => Value::Empty,
    }
}
```

If either operand is `Empty` (null/missing property), the result is `Empty`. This matches Notion's behavior — a formula referencing a missing property returns blank, not an error.

## The Full Pipeline in One Call

```
User types formula → bridge.ts compiles → WASM lexer+parser+compiler → handle stored in cache
                                                                           ↓
Table renders       → bridge.ts evaluateHandle(handle, rowProps) → WASM VM executes → value returned
                                                                           ↑
                                                                     (500 rows = 500 calls,
                                                                      same compiled chunk)
```

The compilation (lexer + parser + compiler) runs once. The VM runs once per row. This is why the handle cache matters — without it, you'd recompile the formula 500 times per render.

## Built-in Functions

The engine ships with ~50 built-in functions grouped by category:

| Category | Functions |
|---|---|
| Math | `abs`, `ceil`, `floor`, `round`, `min`, `max`, `sqrt`, `pow`, `log`, `exp` |
| Text | `length`, `lower`, `upper`, `trim`, `contains`, `replace`, `slice`, `split`, `join` |
| Date | `now`, `today`, `year`, `month`, `day`, `hour`, `minute`, `dateAdd`, `dateSub`, `formatDate` |
| Logic | `if`, `and`, `or`, `not`, `empty`, `switch` |
| Array | `map`, `filter`, `reduce`, `find`, `some`, `every`, `sort`, `reverse`, `flat`, `unique` |
| Type | `toNumber`, `toText`, `toDate`, `type` |

Each is registered in a function table and called via `CallBuiltin(index, arg_count)`.

## References

- [matklad — Simple but Powerful Pratt Parsing](https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html) — The blog post by the rust-analyzer author that inspired the Pratt parser implementation in the formula engine.
- [Crafting Interpreters — A Bytecode Virtual Machine](https://craftinginterpreters.com/a-bytecode-virtual-machine.html) — Robert Nystrom’s book chapter on stack-based VMs, the model for the formula engine’s execution layer.
- [Crafting Interpreters — Compiling Expressions](https://craftinginterpreters.com/compiling-expressions.html) — How to compile parsed expressions into bytecode instructions (the pattern used by the formula compiler).
- [Vaughan Pratt — Top Down Operator Precedence (1973)](https://tdop.github.io/) — The original paper describing the operator-precedence parsing technique.
