# `secure-coding/detect-non-literal-regexp` — the contract

CWE-400. A port of `eslint-plugin-security/detect-non-literal-regexp`, so this
spec has a second job: saying what makes the port worth having.

**Every claim below was executed.**

---

## 0. What the weakness actually is, measured

A pattern the caller can steer reaching the `RegExp` constructor. Two distinct
harms, and they are not the same finding:

**Denial of service.** The caller supplies a catastrophic pattern.

```
new RegExp('^(a+)+$').test('a'×28 + '!')      1342.5 ms
```

**Logic bypass.** The caller supplies a pattern that matches everything.

```
new RegExp('.*').test('totally-unrelated')    true
```

The second is the one people forget, and it is why "the pattern is not
catastrophic" does not make a steerable pattern safe.

### All four spellings are the same intrinsic

```
const R = RegExp; new R('a') instanceof RegExp     true
globalThis.RegExp === RegExp                       true
RegExp('a') instanceof RegExp                      true
new RegExp(/a/) instanceof RegExp                  true
```

The original visits `NewExpression` and tests `callee.name === 'RegExp'`, so it
sees exactly one of these. That is the port's first reason to exist.

### A `const` pattern is fully determined

```
const SRC = '^(a+)+$';  new RegExp(SRC).source === SRC     true
```

The original reports this, because its notion of "static" stops at a literal
argument. The program has already decided the value; a caller cannot steer it.
That is the port's second reason to exist — and it is a **precision** gain,
which is the rarer kind.

### Escaping is verifiable, and a name is not

```
esc('(a+)+$')  →  \(a\+\)\+\$      does NOT match 'aaaa'
```

Escaping is a real guard. But recognising it **by the name of the function that
did it** is not: `const escapeRegExp = (s) => s` is one line, and a name-keyed
allowlist becomes an evasion surface rather than a safety check.

---

## 1. Sink

The `RegExp` intrinsic, resolved through the scope chain, in all four spellings.
Shared with `no-redos-vulnerable-regex` via `utils/regexp-intrinsic.ts` — one
resolver, so a newly discovered spelling is learned once by both rules.

## 2. Source

A pattern argument the program does not fix: a function parameter, a request
surface member, a value read from input. **Not** a `const` the file declares,
and **not** a template literal whose interpolations are all statically known.

## 3. Path

One binding hop, `String.raw`, template literals with static parts, and
concatenation. Beyond that — a parameter with no visible initializer —
[L1](../../ANALYSIS-LIMITS.md).

## 4. Guard

- the pattern is escaped before construction, recognised **structurally** (the
  replace call and its character class), never by the escaper's name
- every interpolated part resolves to a static value
- the pattern is a literal

## 5. Context

Test files, fixtures, codemods and AST tooling, where `new RegExp(x)` is
machinery rather than a request path.

---

## The five decisions

| # | Decision | This rule |
| :--- | :--- | :--- |
| 1 | Sink identified by | scope resolution to the intrinsic, all four spellings |
| 2 | Source identified by | "can the program decide this value" — `isStaticExpression`, not a name |
| 3 | Path depth | one binding hop; a parameter is L1 |
| 4 | Guard | structural escaping, or full static resolution |
| 5 | **When unprovable** | **report.** A pattern the file cannot fix may be caller-steerable, and the harm includes logic bypass, not just DoS |

---

## The prediction

**These must report:**

1. `new RegExp(userInput)` — the canonical case
2. `RegExp(userInput)` — no `new`
3. `new globalThis.RegExp(userInput)`
4. `const R = RegExp; new R(userInput)`
5. `` new RegExp(`^${userInput}$`) `` — interpolated, not fixed

**These must stay quiet:**

1. `new RegExp('^[a-z]+$')` — a literal
2. `const SRC = '^[a-z]+$'; new RegExp(SRC)` — **the program decided it** (the original reports this; we must not)
3. `` new RegExp(`^${CONST}$`) `` where `CONST` is statically known
4. A pattern escaped before construction
5. `function render(RegExp) { RegExp(p) }` — a parameter shadowing the intrinsic
6. `new RegExp(String.raw\`^\w+$\`)` — fixed at parse time

**Where this rule and `no-redos-vulnerable-regex` must not both fire:** a
runtime-built pattern is this rule's finding; a catastrophic *literal* is the
other rule's. Currently `new RegExp(req.query.p)` draws a report from this rule
**and** from `no-unsafe-regex-construction` — a measured partition failure,
recorded in `SEAL.json`.

---

*Frozen 2026-08-19. Written after the rule — the honest caveat. Every claim in it
is executed rather than asserted.*
