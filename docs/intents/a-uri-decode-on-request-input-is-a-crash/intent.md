---
slug: a-uri-decode-on-request-input-is-a-crash
opened: 2026-11-25
packages:
  - eslint-plugin-secure-coding
  - oxlint-plugin-secure-coding
cases: []
---

# Intent — a `decodeURIComponent` on request input is a crash the plugin can name

> Stage 1 artifact. Opened from two URIError crashes we hit ourselves on
> 2026-11-24 and a measurement of how often the call goes unguarded.

**Status:** review · **Opened:** 2026-11-25 · **Owner:** @ofri-peretz

---

## What is wanted

A proposed rule, `no-unguarded-uri-decode`, reports a `decodeURIComponent(x)` or
`decodeURI(x)` call where `x` is request or browser-location input and the call
is not inside a `try` block that has a `catch`. Both functions throw
`URIError: URI malformed` on a `%` that does not start a valid escape (`p%ss`,
`%E0%A4%A`, a bare `%`), so a client that sends one gets a 500 or, outside a
framework's error boundary (a timer, a socket handler, startup code), a dead
process. That is CWE-248 with a denial-of-service consequence.

A literal argument is checked at lint time: a malformed literal is reported,
a valid one is not.

## Why now

- Our own `conventions/utm-taxonomy` threw URIError on `%E0%A4%A` and stopped
  ESLint for the whole file. The lock is
  `packages/eslint-plugin-conventions/src/rules/conventions/utm-malformed-escape.test.ts`.
- Node.js core's `ProxyConfig` (`lib/internal/http.js`) decodes proxy
  credentials with no guard, so `NODE_USE_ENV_PROXY=1` and a password with a
  plain `%` kill every Node process at startup with a bare URIError. A fix is
  prepared upstream.
- Measured 2026-11-25 over this repo's `node_modules` (51,148 `.js`/`.cjs`/`.mjs`
  files, test and fixture folders skipped; an acorn scan, script in the PR
  thread): 710 `decodeURI`/`decodeURIComponent` calls, 403 inside a `try`, 307
  not. Of the 307, 5 decode request or `location` input (Next.js's dev
  hot-reloader on `req.url`, Storybook's router and Vite's client on
  `location`), and 57 more decode a URL part or `process.env`, mostly the parts
  of a configured URL (`proxy.password` in `http-proxy-agent`, `https-proxy-agent` and `hpagent`;
  `url.username`/`password`/`pathname` in `knex`, `pg-connection-string` and
  `mongodb`).

Library code is not where this rule earns its keep: a server app that decodes
`req.params` or `req.query` outside a `try` is. That yield is _unmeasured_.

## Affected users and systems

`eslint-plugin-secure-coding` and its oxlint alias, the rule's docs page and the
generated docs site pages. No existing rule changes.

## Constraints

- The decisive test puts this in `secure-coding`: `decodeURIComponent` is
  ECMAScript, and the sources are Node's `http` request and the DOM. No
  framework has to be installed.
- Sources are decided by structure: a request parameter (`req`, `request`,
  `ctx.request` of a route handler) and its `.url`, `.originalUrl`, `.path`,
  `.params.*`, `.query.*`, `.headers.*`; `location.*`, `document.URL`,
  `document.cookie`. Never by the spelling of an arbitrary variable.
- A configured URL (`process.env.*`, a connection string) is not in v1. The 57
  library sites above throw at configuration time, where the thrown error is the
  error report. The Node case shows the message can be useless, but that is a
  quality complaint, not a crash a client can cause.
- `url.searchParams.get(k)` and `URLSearchParams` are already decoded and are
  never a source.
- No auto-fix: the right fallback (400, raw value, skip) depends on the code. A
  suggestion may wrap the call in `try`/`catch`.

## Success criteria

- RuleTester: `decodeURIComponent(req.params.id)` in an Express handler reports;
  the same call inside `try { } catch { }` does not; `decodeURIComponent('%20')`
  does not; `decodeURIComponent('%E0%A4%A')` does.
- Fidelity model `secure-coding/no_unguarded_uri_decode` passes with 0
  divergences over every source x guard x literal shape.
- A corpus run over the benchmark app set reports its hit count and a hand-read
  precision of at least 90% before the rule joins `recommended`.

## Open questions

- Does a framework error boundary (Express 5 catches a throw in an async
  handler and answers 500) make an unguarded decode in a route handler a 500
  rather than a crash, and should the rule stay silent there or report at a lower
  severity? The client still controls a 500 on demand.
- Should a function only ever called inside a `try` in the same file count as
  guarded (the spec's optional second guard)?
