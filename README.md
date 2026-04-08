# 🖥️ ABC Tech Compiler
### A Lightweight C++ Subset IDE with Full Compilation Pipeline

![Version](https://img.shields.io/badge/version-1.0.0-4ade80?style=flat-square)
![Language](https://img.shields.io/badge/language-JavaScript-f7df1e?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Browser-22d3ee?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-a78bfa?style=flat-square)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Live Demo](#live-demo)
4. [Architecture](#architecture)
5. [Compilation Pipeline](#compilation-pipeline)
   - [Phase 1 — Lexer](#phase-1--lexer-lexical-analysis)
   - [Phase 2 — Parser](#phase-2--parser-syntax-analysis)
   - [Phase 3 — Semantic Analyzer](#phase-3--semantic-analyzer)
   - [Phase 4 — IR Generator](#phase-4--ir-generator-intermediate-representation)
   - [Phase 5 — Assembly Generator](#phase-5--assembly-generator)
   - [Phase 6 — Virtual Machine](#phase-6--virtual-machine-ir-interpreter)
6. [Supported Language Features](#supported-language-features)
7. [Grammar Reference](#grammar-reference)
8. [Example Programs](#example-programs)
9. [IDE Interface](#ide-interface)
10. [Error Handling](#error-handling)
11. [IR Instruction Set Reference](#ir-instruction-set-reference)
12. [Assembly Output Format](#assembly-output-format)
13. [Project Structure](#project-structure)
14. [Getting Started](#getting-started)
15. [Known Limitations](#known-limitations)
16. [Contributing](#contributing)

---

## Overview

**ABC Tech Compiler** is a fully client-side, single-file browser IDE that implements a complete compilation pipeline for a statically-typed C++ subset language. Written entirely in vanilla JavaScript with zero runtime dependencies, it runs completely in the browser — no server, no build tools, no installation required.

The project was built as an educational demonstration of classical compiler design theory, implementing every major phase of a real compiler: lexical analysis, parsing, semantic analysis, intermediate representation generation, assembly code generation, and virtual machine execution.

**Why this project?** Most compiler education resources are either purely theoretical or require complex setups. ABC Tech Compiler puts a full, working, interactive pipeline right in the browser, letting students and developers see how source code transforms at every stage — from raw characters to executable output.

---

## Features

### Compiler Features
- **Full 6-phase compilation pipeline** from source to execution
- **Real-time syntax and semantic error detection** with line/column information
- **Intermediate Representation (IR) visualization** — three-address code
- **x86-64 style assembly code generation** (hypothetical virtual machine output)
- **Recursive function calls** with proper stack frame simulation
- **Type checking** — `int`, `bool`, `string` with assignment compatibility rules
- **Scope analysis** — nested scopes, shadowing, proper variable resolution

### IDE Features
- **Syntax-aware editor** with line numbers and cursor position tracking
- **Tab-based output panel** — Output, Errors, Tokens, AST, IR, Assembly
- **7 built-in example programs** covering common patterns
- **Pipeline status sidebar** — real-time phase status with timing (ms)
- **Compilation statistics** — lines, tokens, IR instructions, error count
- **Code formatter** — auto-indentation normalization
- **Keyboard shortcuts** — `Ctrl+Enter` to compile and run
- **Fully self-contained** — single HTML file, no dependencies

---

## Live Demo

Open `index.html` in any modern browser. No installation needed.

```bash
# Clone and open
git clone https://github.com/abctech/compiler.git
cd compiler
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Or simply drag `index.html` into your browser.

---

## Architecture

The compiler is structured as a classical **multi-phase pipeline**. Each phase produces an output artifact consumed by the next phase. All phases run synchronously in the browser's JavaScript engine.

```
Source Code (string)
        │
        ▼
  ┌─────────────┐
  │   LEXER     │  → Token Stream
  └─────────────┘
        │
        ▼
  ┌─────────────┐
  │   PARSER    │  → Abstract Syntax Tree (AST)
  └─────────────┘
        │
        ▼
  ┌─────────────┐
  │  SEMANTIC   │  → Annotated AST + Error List
  │  ANALYZER   │
  └─────────────┘
        │
        ▼
  ┌─────────────┐
  │   IR GEN    │  → Three-Address Code Instructions
  └─────────────┘
        │
        ├────────────────────────┐
        ▼                        ▼
  ┌─────────────┐        ┌─────────────┐
  │   VM EXEC   │        │   ASM GEN   │
  │ (interprets)│        │ (x86-style) │
  └─────────────┘        └─────────────┘
        │
        ▼
  Program Output
```

### Class Diagram

```
Lexer
  ├── tokenize() → Token[]
  └── Error: LexerError

Parser
  ├── parse() → ProgramNode
  └── Error: ParseError

SemanticAnalyzer
  ├── analyze(node) → type: string
  ├── SymbolTable (nested scopes)
  └── errors: SemanticError[]

IRGen
  ├── gen(node) → operand: string
  ├── instructions: IRInstruction[]
  └── formatIR() → string

AsmGen
  ├── gen(irInstructions) → string
  └── stackSlots: { [name]: offset }

VM (VirtualMachine)
  ├── run()
  ├── execFunc(name, env, ...)
  └── resolve(val, env) → value
```

---

## Compilation Pipeline

### Phase 1 — Lexer (Lexical Analysis)

**Class:** `Lexer` / `CleanLexer`  
**Input:** Raw source code string  
**Output:** `Token[]` — an ordered list of tokens

The lexer performs character-by-character scanning of the source code, grouping characters into meaningful **tokens**. It handles:

- **Whitespace skipping** — spaces, tabs, newlines
- **Comment stripping** — both `//` single-line and `/* */` block comments
- **Integer literals** — sequences of digits, parsed as `parseInt`
- **String literals** — double-quoted strings with `\n`, `\t` escape sequences
- **Identifiers and keywords** — checked against the `KEYWORDS` map
- **Operators** — single and multi-character (`==`, `!=`, `<=`, `>=`, `&&`, `||`)
- **Delimiters** — parentheses, braces, semicolons, commas

**Token Types:**

| Category | Tokens |
|----------|--------|
| Types | `int`, `bool`, `void` |
| Control Flow | `if`, `else`, `while`, `for`, `return`, `break`, `continue` |
| I/O | `print`, `input` |
| Literals | `INT_LITERAL`, `BOOL_LITERAL`, `STRING_LITERAL`, `true`, `false` |
| Operators | `+` `-` `*` `/` `%` `=` `==` `!=` `<` `>` `<=` `>=` `&&` `||` `!` |
| Delimiters | `(` `)` `{` `}` `;` `,` |
| Special | `IDENTIFIER`, `EOF` |

**Error:** `LexerError` — thrown on unknown characters or unterminated strings. Carries `line` and `col` for precise error reporting.

```
Source: int x = 42;
Tokens: [INT, IDENTIFIER("x"), ASSIGN, INT_LITERAL(42), SEMICOLON, EOF]
```

---

### Phase 2 — Parser (Syntax Analysis)

**Class:** `Parser`  
**Input:** `Token[]`  
**Output:** `ProgramNode` — root of the Abstract Syntax Tree

The parser uses **recursive descent** parsing — one function per grammar rule. It builds the AST by consuming tokens from the token stream, enforcing the language's grammar.

**Operator precedence** (lowest to highest):

| Level | Operators | Associativity |
|-------|-----------|---------------|
| 1 | Assignment `=` | Right |
| 2 | Logical OR `\|\|` | Left |
| 3 | Logical AND `&&` | Left |
| 4 | Equality `==` `!=` | Left |
| 5 | Relational `<` `>` `<=` `>=` | Left |
| 6 | Additive `+` `-` | Left |
| 7 | Multiplicative `*` `/` `%` | Left |
| 8 | Unary `-` `!` | Right |
| 9 | Primary (literals, calls, grouping) | — |

**AST Node Types:**

| Node | Fields | Description |
|------|--------|-------------|
| `ProgramNode` | `declarations[]` | Root node — list of top-level declarations |
| `FuncDeclNode` | `retType`, `name`, `params[]`, `body` | Function declaration |
| `VarDeclNode` | `varType`, `name`, `init` | Variable declaration with optional initializer |
| `BlockNode` | `statements[]` | Braced block of statements |
| `IfNode` | `condition`, `thenBranch`, `elseBranch` | If/else statement |
| `WhileNode` | `condition`, `body` | While loop |
| `ForNode` | `init`, `condition`, `increment`, `body` | For loop |
| `ReturnNode` | `value` | Return statement |
| `BreakNode` | — | Break statement |
| `ContinueNode` | — | Continue statement |
| `PrintNode` | `args[]` | Built-in print statement |
| `AssignNode` | `name`, `value` | Assignment expression |
| `BinOpNode` | `op`, `left`, `right` | Binary operation |
| `UnaryNode` | `op`, `expr` | Unary operation |
| `CallNode` | `name`, `args[]` | Function call |
| `VarNode` | `name` | Variable reference |
| `IntLitNode` | `value` | Integer literal |
| `BoolLitNode` | `value` | Boolean literal |
| `StringLitNode` | `value` | String literal |

**Error:** `ParseError` — thrown on grammar violations. Carries the offending token with `line` and `col`.

---

### Phase 3 — Semantic Analyzer

**Class:** `SemanticAnalyzer`  
**Input:** AST (`ProgramNode`)  
**Output:** Type information (returned from `analyze()`), collected `SemanticError[]`

The semantic analyzer performs a **recursive tree walk** of the AST, checking for type correctness and scope validity. Unlike the lexer and parser which throw on first error, the semantic analyzer **collects all errors** and continues analysis.

**Checks performed:**

- **Type checking** — arithmetic operators require `int`, equality requires matching types, conditions require `bool` or `int`
- **Scope analysis** — undeclared variables and functions, duplicate declarations in same scope
- **Function validation** — argument count matching, return type checking
- **Control flow validation** — `break` and `continue` only inside loops, `return` only inside functions
- **Variable shadowing** — inner scopes may redeclare names from outer scopes (intentional)

**Symbol Table:** Implemented as a linked list of `SymbolTable` objects, one per scope. Lookup walks up the parent chain. Each entry stores `{ varType, kind: 'var' | 'func' | 'param', params? }`.

**Type compatibility rules:**

| Assignment | Allowed? |
|-----------|----------|
| `int` ← `int` | ✅ |
| `bool` ← `bool` | ✅ |
| `int` ← `bool` | ✅ (bool is a subtype of int) |
| `bool` ← `int` | ❌ |
| Any ← `string` | Only `string` variables |

---

### Phase 4 — IR Generator (Intermediate Representation)

**Class:** `IRGen`  
**Input:** AST (`ProgramNode`)  
**Output:** `IRInstruction[]` — list of three-address code instructions, `formatIR()` string

The IR generator performs another AST walk, emitting **three-address code (TAC)** instructions. TAC is a low-level linear representation where each instruction has at most one operation and at most three operands: `result = arg1 op arg2`.

**Temporaries:** The generator creates fresh temporary variables (`t1`, `t2`, ...) for intermediate values. Labels are generated for control flow (`L1`, `L2`, ..., with descriptive prefixes like `while1`, `endwhile1`).

**IR Instruction Set:**

| Opcode | Format | Description |
|--------|--------|-------------|
| `FUNC_BEGIN` | `FUNC name:` | Start of function |
| `FUNC_END` | `END FUNC name` | End of function |
| `PARAM` | `PARAM type name` | Declare function parameter |
| `DECLARE` | `DECLARE type name` | Declare variable (uninitialized) |
| `ASSIGN` | `result = src` | Copy/assign value |
| `ADD` | `result = a ADD b` | Integer addition |
| `SUB` | `result = a SUB b` | Integer subtraction |
| `MUL` | `result = a MUL b` | Integer multiplication |
| `DIV` | `result = a DIV b` | Integer division (truncated) |
| `MOD` | `result = a MOD b` | Modulo |
| `EQ` | `result = a EQ b` | Equality (1 or 0) |
| `NEQ` | `result = a NEQ b` | Inequality |
| `LT` | `result = a LT b` | Less than |
| `GT` | `result = a GT b` | Greater than |
| `LTE` | `result = a LTE b` | Less than or equal |
| `GTE` | `result = a GTE b` | Greater than or equal |
| `AND` | `result = a AND b` | Logical AND |
| `OR` | `result = a OR b` | Logical OR |
| `NEG` | `result = NEG a` | Unary negation |
| `NOT` | `result = NOT a` | Logical NOT |
| `LABEL` | `name:` | Jump target label |
| `GOTO` | `GOTO label` | Unconditional jump |
| `IF_FALSE` | `IF_FALSE cond GOTO label` | Conditional jump if falsy |
| `RETURN` | `RETURN [val]` | Return from function |
| `PRINT` | `PRINT args` | Output to console |
| `ARG` | `ARG val` | Push function argument |
| `CALL` | `result = CALL name argc` | Function call |
| `BREAK` | `BREAK` | Loop break (VM handles) |
| `CONTINUE` | `CONTINUE` | Loop continue (VM handles) |

**Example — `if` statement translation:**

```
// Source
if (x > 0) { print(x); }

// IR
000:   t1 = x GT 0
001:   IF_FALSE t1 GOTO else1
002:   PRINT x
003:   GOTO endif1
004: else1:
005: endif1:
```

---

### Phase 5 — Assembly Generator

**Class:** `AsmGen`  
**Input:** `IRInstruction[]`  
**Output:** x86-64 style assembly string (hypothetical virtual machine target)

The assembly generator performs a linear pass over the IR instruction list, emitting **NASM-style x86-64 assembly**. The output is illustrative — it demonstrates what real compiled output would look like, using standard x86-64 conventions:

- **Registers:** `rax`, `rbx`, `rcx`, `rdx`, `rsi`, `rdi`, `rsp`, `rbp`
- **Calling convention:** arguments pushed before `call`, return value in `rax`
- **Stack frame:** `push rbp` / `mov rbp, rsp` prologue, `pop rbp` / `ret` epilogue
- **Variables:** stack-allocated as `[rbp-N]` offsets (8 bytes each)
- **Comparisons:** `cmp` + `setX` + `movzx` pattern for boolean results

The assembly output includes a `.data` section, `.text` section, and a `_start` entry point that calls `main`.

> **Note:** The assembly is for educational illustration. It targets a hypothetical x86-64 Linux ABI and is not directly assembleable without a `printf` stub and linker setup.

---

### Phase 6 — Virtual Machine (IR Interpreter)

**Class:** `VM` / `VirtualMachine`  
**Input:** `IRInstruction[]`, output callback  
**Output:** Program output string (via callback)

The VM is a **direct IR interpreter** that executes the instruction list. It maintains:

- **Environment (`env`):** A plain JavaScript object mapping variable names to values
- **Label map:** Pre-built index from label names to instruction indices for O(1) jumps
- **Function map:** Pre-built index from function names to `FUNC_BEGIN` instruction indices
- **Call stack:** For tracking return addresses and result destinations
- **Step counter:** Enforces a maximum of 500,000 steps to catch infinite loops

**Execution model:**

The VM starts at instruction index 0. For top-level code, it executes instructions linearly, skipping function definitions. When a `CALL` is encountered, the VM recursively calls `execFunc()`, which sets up a fresh environment with parameters bound to arguments, then executes the function's instruction range until `RETURN` or `FUNC_END`.

**Value resolution:** The `resolve(val, env)` method converts IR operands to JavaScript values:
- Numeric string `"42"` → `42`
- Quoted string `'"hello"'` → `"hello"` (with escape processing)
- Variable name → looks up in `env`

**Safety features:**
- Division and modulo by zero throw runtime errors
- Step limit prevents infinite loops from hanging the browser
- Undefined function calls throw `VMError`

---

## Supported Language Features

### Data Types

| Type | Values | Notes |
|------|--------|-------|
| `int` | 32-bit integer range | Arithmetic, comparisons |
| `bool` | `true`, `false` | Conditions, logical ops |
| `void` | — | Function return type only |
| `string` | Double-quoted strings | Print only, no operations |

### Statements

- Variable declarations: `int x = 5;`, `bool flag = true;`
- Function declarations with parameters and return type
- `if` / `else` conditionals
- `while` loops
- `for` loops (with declaration in initializer)
- `break` and `continue`
- `print(expr, expr, ...)` — built-in variadic output
- Nested blocks `{ ... }` with own scope
- Expression statements (assignments, function calls)

### Expressions

- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `&&`, `||`, `!`
- Unary: `-`, `!`
- Assignment: `=` (right-associative)
- Function calls: `name(arg1, arg2, ...)`
- Grouping: `(expr)`

### Functions

- Recursive functions supported
- Multiple parameters
- Return values of any declared type
- Functions must be declared before use (forward declarations not supported)

---

## Grammar Reference

```ebnf
program         ::= declaration*

declaration     ::= funcDecl | varDecl | statement

funcDecl        ::= type IDENTIFIER '(' paramList? ')' block
varDecl         ::= type IDENTIFIER ('=' expression)? ';'
paramList       ::= param (',' param)*
param           ::= type IDENTIFIER

type            ::= 'int' | 'bool' | 'void'

block           ::= '{' declaration* '}'

statement       ::= ifStmt
                  | whileStmt
                  | forStmt
                  | returnStmt
                  | breakStmt
                  | continueStmt
                  | printStmt
                  | block
                  | exprStmt

ifStmt          ::= 'if' '(' expression ')' statement ('else' statement)?
whileStmt       ::= 'while' '(' expression ')' statement
forStmt         ::= 'for' '(' (varDecl | exprStmt | ';') expression? ';' expression? ')' statement
returnStmt      ::= 'return' expression? ';'
breakStmt       ::= 'break' ';'
continueStmt    ::= 'continue' ';'
printStmt       ::= 'print' '(' argList? ')' ';'
exprStmt        ::= expression ';'

expression      ::= assignment
assignment      ::= IDENTIFIER '=' assignment | or
or              ::= and ('||' and)*
and             ::= equality ('&&' equality)*
equality        ::= relational (('==' | '!=') relational)*
relational      ::= additive (('<' | '>' | '<=' | '>=') additive)*
additive        ::= multiplicative (('+' | '-') multiplicative)*
multiplicative  ::= unary (('*' | '/' | '%') unary)*
unary           ::= ('-' | '!') unary | primary
primary         ::= INT_LITERAL
                  | BOOL_LITERAL
                  | STRING_LITERAL
                  | IDENTIFIER '(' argList? ')'
                  | IDENTIFIER
                  | '(' expression ')'

argList         ::= expression (',' expression)*
```

---

## Example Programs

### Hello World
```cpp
int main() {
  int x = 42;
  print("Hello, ABC Tech World!");
  print("The answer is:", x);
  return 0;
}
```

### Fibonacci (Iterative)
```cpp
int main() {
  int n = 10;
  int a = 0;
  int b = 1;
  int i = 0;
  while (i < n) {
    print(a);
    int temp = a + b;
    a = b;
    b = temp;
    i = i + 1;
  }
  return 0;
}
```

### Recursive Factorial
```cpp
int factorial(int n) {
  if (n <= 1) { return 1; }
  return n * factorial(n - 1);
}

int main() {
  int i = 1;
  while (i <= 8) {
    print(i, "! =", factorial(i));
    i = i + 1;
  }
  return 0;
}
```

### For Loop with Scoped Declaration
```cpp
int main() {
  for (int j = 1; j <= 5; j = j + 1) {
    int sq = j * j;
    print(j, "squared =", sq);
  }
  return 0;
}
```

### Variable Scoping
```cpp
int main() {
  int x = 10;
  {
    int x = 20;   // shadows outer x
    print("Inner:", x);   // prints 20
  }
  print("Outer:", x);     // prints 10
  return 0;
}
```

---

## IDE Interface

### Layout

The IDE is a three-column layout:

```
┌─────────────┬───────────────────────┬──────────────────────┐
│  SIDEBAR    │      EDITOR           │    OUTPUT PANEL      │
│             │                       │                      │
│ Examples    │  Line numbers         │ Tabs:                │
│ Pipeline    │  Code editor          │  ▶ Output            │
│   status    │  Status bar           │  ⚠ Errors            │
│ Statistics  │                       │  ◈ Tokens            │
│             │                       │  ⟨⟩ AST             │
│             │                       │  ⊞ IR                │
│             │                       │  ≋ Assembly          │
└─────────────┴───────────────────────┴──────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Compile and run |
| `Tab` | Insert 2-space indent |

### Sidebar — Pipeline Status

Each compilation phase shows:
- 🟢 Green dot — phase succeeded
- 🔴 Red dot — phase failed
- Elapsed time in milliseconds

### Output Tabs

| Tab | Content |
|-----|---------|
| **Output** | Program's printed output + success/error summary |
| **Errors** | List of errors with phase, message, and source location |
| **Tokens** | Full token list: index, type, value, line:col |
| **AST** | Collapsible tree view of the abstract syntax tree |
| **IR** | Formatted three-address code with syntax highlighting |
| **Assembly** | x86-64 style assembly output with register highlighting |

---

## Error Handling

The compiler reports errors from four phases, each with structured metadata:

### Lexer Errors
Thrown immediately on the first invalid character. Stops compilation.
```
LexerError: Unknown character '@' — Line 5, Col 12
```

### Parser Errors
Thrown on the first grammar violation. Stops compilation.
```
ParseError: Expected ';' — got 'int' at line 7
```

### Semantic Errors
Collected into a list — all errors are reported before stopping execution.
```
SemanticError: Undeclared variable 'xyz' — Line 12
SemanticError: Return type mismatch: expected 'int', got 'bool' — Line 18
SemanticError: 'break' outside loop — Line 25
```

### Runtime Errors (VM)
Thrown during execution of the IR.
```
VMError: Division by zero — Execution phase
VMError: Execution limit exceeded (possible infinite loop)
VMError: Undefined function 'foo'
```

---

## IR Instruction Set Reference

Each instruction is a JavaScript object `{ op, arg1, arg2, result }`.

```
000: FUNC main:             // FUNC_BEGIN — marks start of function 'main'
001:   PARAM int n          // PARAM — declare parameter 'n' of type 'int'
002:   DECLARE int x        // DECLARE — allocate variable 'x' (init to 0)
003:   x = 42               // ASSIGN — assign literal 42 to x
004:   t1 = x ADD 1         // ADD — arithmetic, result in temp t1
005:   x = t1               // ASSIGN — store result back
006:   IF_FALSE t1 GOTO L2  // IF_FALSE — branch if t1 is falsy
007:   GOTO L1              // GOTO — unconditional jump
008: L1:                    // LABEL — jump target
009:   PRINT x|||"hello"    // PRINT — multi-arg separated by |||
010:   ARG x                // ARG — push argument for next call
011:   t2 = CALL foo 1      // CALL — call 'foo' with 1 arg, result to t2
012:   RETURN t2            // RETURN — return value t2
013: END FUNC main          // FUNC_END — marks end of function
```

---

## Assembly Output Format

The generated x86-64 assembly follows NASM syntax conventions:

```asm
; ABC Tech Compiler — x86-64 Assembly Output
; Generated for Hypothetical Virtual Machine

section .data
  fmt_int db "%d", 10, 0
  fmt_str db "%s", 10, 0

section .text
  global main
  extern printf

main:
  push rbp
  mov rbp, rsp
  sub rsp, 256

  ; Variable assignment: x = 42
  mov rax, 42
  mov [rbp-8], rax

  ; Addition: t1 = x + y
  mov rax, [rbp-8]
  mov rbx, [rbp-16]
  add rax, rbx
  mov [rbp-24], rax

  ; Conditional branch
  mov rax, [rbp-24]
  test rax, rax
  jz L2

L1:
  ; ...

  mov rsp, rbp
  pop rbp
  ret

section .note.GNU-stack noalloc noexec nowrite progbits
```

Stack variables are assigned sequential 8-byte slots: `[rbp-8]`, `[rbp-16]`, `[rbp-24]`, etc. Each unique variable or temporary gets its own slot, tracked in `AsmGen.stackSlots`.

---

## Project Structure

```
compiler/
│
├── index.html              # Complete single-file IDE (HTML + CSS + JS)
│
├── compiler.js             # Standalone compiler module (same logic, exportable)
│   ├── TokenType           # Token type constants
│   ├── KEYWORDS            # Keyword → TokenType map
│   ├── Token               # Token class
│   ├── Lexer / CleanLexer  # Lexical analysis
│   ├── ASTNode subclasses  # All 18 AST node types
│   ├── Parser              # Recursive descent parser
│   ├── SymbolTable         # Scope chain implementation
│   ├── SemanticAnalyzer    # Type & scope checking
│   ├── IRGen               # Three-address code generator
│   ├── AsmGen              # x86-64 assembly generator
│   ├── VM / VirtualMachine # IR interpreter
│   └── compile()           # Master orchestration function
│
└── README.md               # This file
```

The `compiler.js` file exports `window.ABCCompiler = { compile, TokenType }` when loaded in the browser, making it usable as a library in other projects.

---

## Getting Started

### Run in Browser (Simplest)

```bash
# No build step needed — just open the file
open index.html
```

### Use as a Library

```html
<script src="compiler.js"></script>
<script>
  const result = ABCCompiler.compile(`
    int main() {
      print("Hello from library!");
      return 0;
    }
  `);

  console.log(result.output);      // "Hello from library!\n"
  console.log(result.success);     // true
  console.log(result.stats);       // { lines, tokens, instructions, errors }
  console.log(result.ir);          // formatted IR string
  console.log(result.assembly);    // x86-64 assembly string
  console.log(result.tokens);      // Token[]
  console.log(result.ast);         // ProgramNode (AST root)
  console.log(result.errors);      // [] or [{ phase, message, line, col }]
  console.log(result.phases);      // { lexer, parser, semantic, irgen, asm, vm }
</script>
```

### `compile()` Return Object

```typescript
interface CompileResult {
  tokens:       Token[];
  ast:          ProgramNode | null;
  ir:           string;
  assembly:     string;
  output:       string;
  errors:       { phase: string; message: string; line?: number; col?: number }[];
  phases: {
    lexer?:    { time: string; ok: boolean };
    parser?:   { time: string; ok: boolean };
    semantic?: { time: string; ok: boolean };
    irgen?:    { time: string; ok: boolean };
    asm?:      { time: string; ok: boolean };
    vm?:       { time: string; ok: boolean };
  };
  stats: {
    lines:        number;
    tokens:       number;
    instructions: number;
    errors:       number;
  };
  success:      boolean;
  totalTime:    string;
}
```

---

## Known Limitations

The compiler implements a **subset** of C++. The following are intentionally unsupported:

| Feature | Status | Notes |
|---------|--------|-------|
| Arrays / pointers | ❌ | Not implemented |
| Structs / classes | ❌ | Not implemented |
| `#include` / preprocessor | ❌ | Not applicable |
| `std::` library | ❌ | Not applicable |
| Floating-point (`float`, `double`) | ❌ | Integer only |
| `input()` / `scanf` | ❌ | Statement exists but not wired to VM |
| Forward declarations | ❌ | Functions must be defined before use |
| Multiple return points | ⚠️ | First `return` is honored; subsequent may be skipped |
| `break`/`continue` in IR VM | ⚠️ | Limited — emitted but VM handling is partial |
| Operator overloading | ❌ | Not applicable |
| Heap allocation (`new`) | ❌ | Not implemented |
| Unsigned integers | ❌ | All integers are signed |

The execution step limit is **500,000 instructions**, sufficient for the built-in examples. Programs with very large loops or deep recursion may hit this limit.

---

## Contributing

Contributions are welcome! Here are areas where the project could be extended:

- **Array support** — add `int arr[10]` syntax and IR instructions for indexed access
- **Float type** — add `float` token and IR-level float operations
- **`input()` implementation** — wire the `INPUT` IR opcode to `window.prompt()`
- **Optimizer pass** — add constant folding and dead code elimination between IR Gen and VM
- **Better break/continue** — propagate loop labels through the IR so VM can jump correctly
- **Source maps** — link IR instructions back to source line numbers for richer debugging
- **Dark/light theme toggle** — the IDE currently only supports dark theme
- **Local storage persistence** — save editor content across page reloads

### Development Notes

- All compiler code is vanilla JavaScript (ES2020+), no transpiler needed
- The IDE uses CSS custom properties for theming — all colors are in `:root` variables
- The `compile()` function is pure (no side effects except the output callback) — easy to unit test
- Each compiler phase is independently constructable for isolated testing

---

## License

MIT License — free to use, modify, and distribute.

---

*Built as an educational compiler design project. Every character of source code you type passes through six distinct transformation stages before producing output — this project makes all six visible.*
