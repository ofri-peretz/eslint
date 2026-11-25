# Design — `secure-coding/no-unguarded-uri-decode`

**Intent:** [intent.md](./intent.md) · **Status:** built in the PR that adds this file, for review

## Requirements

1. Report a call to the **global** `decodeURIComponent` or `decodeURI` whose argument carries
   request or page-location input, when no `try` block with a `catch`, in the same function,
   surrounds it.
2. Report a string literal (or expression-free template) argument that fails to decode, decided
   by running the decoder on it at lint time.
3. Stay silent on every other argument, on a shadowed decoder, and on a guarded call.

## Design

- **Callee.** An `Identifier` named `decodeURIComponent` or `decodeURI` that resolves to no
  declaration in the file (scope walk); a local function or import of that name is not the
  global.
- **Input**, followed by `carriesInput(expr)` over the argument:
  - a member chain rooted at a **declared** `req`, `request` or `ctx` whose first property is
    `url`, `originalUrl`, `path`, `baseUrl`, `params`, `query`, `headers`, `cookies`,
    `querystring`, `search` or `hash`; Koa's `ctx.request.*` / `ctx.req.*`; `req.get(…)`,
    `req.header(…)`, `req.param(…)`;
  - the undeclared global `location`, `window.location`, `document.location`, and `document.URL`,
    `documentURI`, `cookie`, `referrer`;
  - through text-preserving string/array methods (`split`, `slice`, `replace`, `trim`, `at`,
    `join`, …), `||`, `??`, `?:`, `+`, template expressions, `new URL(input).<part>`, and a
    variable whose declarator initializer (destructuring included) carries input;
  - **never** through `.searchParams` (values come out decoded), any other call, or a
    function parameter of unknown origin.
- **Guard.** Walk parents from the call; a `TryStatement` whose `block` contains the call and
  whose `handler` is non-null guards it; the first function boundary stops the walk.
- **Severity / preset.** `strict` only, CVSS 5.3 (availability). `recommended` waits for the
  corpus precision measurement the intent asks for.

## Evidence

- RuleTester: 42 cases (valid and invalid), all pass on ESLint and oxlint.
- Fidelity model `secure-coding/no_unguarded_uri_decode`: 15 argument shapes x 4 guards x 2
  decoders = 120 inputs, all covered, 0 divergences.
- Corpus: `benchmarks/corpus/CWE-248` gains two vulnerable fixtures (route parameter, location
  hash) and two safe twins (inside `try`/`catch`, `searchParams.get`).

## Rejected alternatives

- **`process.env` and configured-URL parts as sources.** 57 of the 307 unguarded library calls
  measured in the intent are this shape, and they throw at configuration time, where the
  exception is the error report. Reporting them would make the rule mostly about startup
  messages.
- **Treating a framework error boundary as a guard.** Express 5 turns a throw into a 500, but
  the client still chooses when the 500 happens, and Express 4 does not catch in an async
  handler. The rule cannot see which framework version runs the handler.
- **Following values across calls** (a helper that reads a param). That needs inter-procedural
  flow this plugin does not do; it is listed under Known False Negatives.
- **Matching names by substring** (`*Url`, `*Path`). Ruled out by the name-inference gate: a
  variable named `rawUrl` proves nothing about its origin.

## Non-goals

- Auto-fix or a suggestion: the right fallback (400, the raw value, skip the item) depends on
  the code.
