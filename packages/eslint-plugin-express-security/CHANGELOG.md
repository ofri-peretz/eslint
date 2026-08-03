## 1.5.0

### Minor Changes

- [#313](https://github.com/ofri-peretz/eslint/pull/313) [`1f4fc05`](https://github.com/ofri-peretz/eslint/commit/1f4fc05b4798020d7ad9f2524256ba4f2bcbb2a9) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Eight new rules closing the two fixable gaps found by the F#24/F#26 coverage
  benchmark (CWE Top 25 map + framework-depth matrix).

  **Express — the helmet header family** (the depth gap where SonarJS led 17 rules
  to our 14; `require-helmet` only proved the middleware was mounted, never that
  its protections were still on):

  - `no-disabled-helmet-protections` (CWE-693) — `helmet({ contentSecurityPolicy: false })` and the rest of the disabled-default family, helmet 6 and 7 spellings
  - `require-strict-transport-security` (CWE-319) — HSTS disabled, `max-age` below the 180-day preload floor, or `includeSubDomains: false`
  - `no-unsafe-csp-directives` (CWE-79 / 1021 / 311) — `'unsafe-inline'`, `'unsafe-eval'`, wildcard sources, `frame-ancestors '*'`, missing `frame-ancestors` under `useDefaults: false`, and `upgradeInsecureRequests: null`
  - `no-permissive-trust-proxy` (CWE-348) — `app.set('trust proxy', true)`, which makes `req.ip` client-controlled and every rate-limit bucket forgeable

  **Express — CWE Top 25 (2025) access-control adjacency** (three of the four
  JS-applicable entries we did not cover):

  - `require-route-authentication` (CWE-306) — critical-function routes with no auth middleware and no principal read in the handler
  - `no-client-controlled-authorization` (CWE-863) — `if (req.body.role === 'admin')`: the check runs, and passes for anyone who sets the field
  - `no-idor-resource-access` (CWE-639) — `Invoice.findById(req.params.id)` in a handler that never mentions the caller

  **Node — the fourth adjacency** (CWE-77, generic command injection, previously
  covered only as CWE-78):

  - `no-dynamic-command-string` (CWE-77) — an assembled command string handed to a shell flag (`spawn('bash', ['-c', …])`) or to a command-runner that does not escape (`execaCommand`, `$.raw`)

  In `recommended`, the five structural rules ship as `error`; the three
  access-control rules ship as `warn` — their critical-path / authorization-attribute
  / lookup-method vocabularies are name-based, and naming heuristics never carry
  enforcement severity (plugin scope-audit invariant I3).

### Patch Changes

- Updated dependencies [[`a5fad9f`](https://github.com/ofri-peretz/eslint/commit/a5fad9f97a5ef5a64c091d5174fec74fbe1e96c3), [`0231140`](https://github.com/ofri-peretz/eslint/commit/023114046b2844d3daab88f40293bddd75519fe3), [`4cc62d6`](https://github.com/ofri-peretz/eslint/commit/4cc62d63908f91a7c54addadf21678c46c2bcc19)]:
  - @interlace/eslint-devkit@1.6.0

## 1.4.0

### Minor Changes

- [#292](https://github.com/ofri-peretz/eslint/pull/292) [`5664efd`](https://github.com/ofri-peretz/eslint/commit/5664efdc4df72a8621253b2d500c82b09944fd49) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - **`express-security/no-exposed-debug-endpoints` — only route registrations count.** The rule had a second listener that reported _any_ bare string literal equal to a debug path (`/admin`, `/health`, `/debug`, …) anywhere in a file. A redirect-URL constant tripped it while authoring benchmark corpus fixtures — `const ADMIN_PATH = '/admin'`, `res.redirect('/admin')` and `if (req.path === '/health')` were all CWE-489 "Exposed Debug Endpoint" findings, none of which registers an endpoint. That listener is gone: a literal is reported only as the path argument of an express route registration.

  The registration check also now covers every express routing method (`put`, `patch`, `delete`, `head`, `options`, `all`) rather than just `get` / `post` / `use`, plus the chained route builder (`app.route('/admin').delete(handler)`), so `app.delete('/admin/users/:id', handler)` is caught where it previously was not. Conversely, `app.get(name)` with a single argument is an application-setting lookup rather than a route registration and is no longer reported.

- [#293](https://github.com/ofri-peretz/eslint/pull/293) [`d6e2b3c`](https://github.com/ofri-peretz/eslint/commit/d6e2b3ccdcaed3797cffc49772c1b7fa56e78a82) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Seven new rules closing benchmark-corpus coverage gaps (A-lite research wave):

  - `no-host-header-in-links` (CWE-640) — Host-header poisoning in password-reset/email link construction
  - `no-error-details-in-response` (CWE-209) — stack traces / raw error objects sent to clients
  - `no-sensitive-data-in-query` (CWE-598) — passwords/tokens read from GET query strings
  - `no-user-controlled-render-locals` (CWE-73) — `res.render(view, req.body)` template object injection
  - `no-static-root-exposure` (CWE-548) — `express.static(__dirname)` / `serve-index` directory exposure
  - `require-case-insensitive-path-guard` (CWE-178) — case-sensitive path guards bypassed by `/ADMIN`
  - `require-query-type-guard` (CWE-843) — string methods on `req.query` members without type guards

  In the recommended preset four ship as `error` (`no-host-header-in-links`,
  `no-error-details-in-response`, `no-user-controlled-render-locals`,
  `no-static-root-exposure`) and three as `warn` — the two `require-*` guard
  heuristics plus `no-sensitive-data-in-query`, which matches on parameter names
  and so never gets enforcement severity.

### Patch Changes

- [#298](https://github.com/ofri-peretz/eslint/pull/298) [`a53887f`](https://github.com/ofri-peretz/eslint/commit/a53887fdcb4ba5fad0d9f06a19a295d125c7e144) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - **`express-security/no-missing-security-headers` — `.set()` on a non-response receiver is not a header call.** The rule matched `setHeader` / `header` / `set` on the method name alone, so `url.searchParams.set('page', '2')` and `app.set('view engine', 'ejs')` were reported as CVSS 7.5 missing-security-header findings — a false positive on two of the most common calls in an Express codebase. The receiver must now be an HTTP response (`res` / `resp` / `response` / `reply`, including `ctx.res.set(…)` and `this.response.header(…)`). The same predicate gates header _collection_, so a `Content-Security-Policy` string passed to an unrelated `.set()` no longer satisfies the requirement for a real response in the same scope.

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

- Updated dependencies [[`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5), [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358)]:
  - @interlace/eslint-devkit@1.4.3

## 1.3.4

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 1.3.3

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.3.2

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 1.3.1

### Patch Changes

- [#213](https://github.com/ofri-peretz/eslint/pull/213) [`391dbe6`](https://github.com/ofri-peretz/eslint/commit/391dbe6b39f78d549379218567cb959649f8c614) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Align every security rule's `meta.docs.cvss` to the CVSS its finding actually
  emits. The emitted machine-readable message sources its `CVSS:x` from
  `CWE_MAPPING` via `formatLLMMessage` → `enrichFromCWE`, but the static
  `meta.docs.cvss` documentation field had drifted on 45 rules across these 7
  plugins — e.g. `no-hardcoded-credentials` documented `9.5` while emitting
  `CVSS:9.8` (the value the published article and SARIF/LLM consumers already
  read).

  This corrects the **documentation metadata only** — no emitted finding changes.
  Locked by `security-cvss-docs-consistency.lock.test.ts` (cross-plugin: every
  security rule's `meta.docs.cvss` must equal the CVSS it emits), the
  `no-hardcoded-credentials` rule lock (real ESLint `Linter` emission), and a
  devkit `enrichFromCWE` contract test pinning `CWE-798 → 9.8`.

  Follow-up (not in scope): 50 security rules document a CVSS that never appears
  in any emitted message (their messages carry no CWE), and several rules emit the
  generic CWE score where a rule-specific score may be warranted — both change
  emitted output and are separate decisions.

## 1.3.0

### Minor Changes

- [#169](https://github.com/ofri-peretz/eslint/pull/169) [`ae39ec5`](https://github.com/ofri-peretz/eslint/commit/ae39ec52bf619351e6217a823014fc05bb97d618) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat: add `no-user-controlled-redirect` rule — structural CWE-601 open redirect detection

  Fires on `res.redirect(req.query.*)`, `res.redirect(req.body.*)`, and `res.redirect(req.params.*)` — an AST-structural check that passes the naming-heuristic litmus test (rename `res`/`req` to any identifier and the rule still fires, because detection is on the member-access chain, not on variable names). Severity: `error` in flagship config.

### Patch Changes

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

## [1.2.3] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [1.2.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [1.2.1] - 2026-02-02

This was a version bump only for eslint-plugin-express-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-express-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)

## [1.0.0] - 2025-12-29

### Added

#### Headers & CORS Rules (4)

- `require-helmet` - Require helmet middleware for security headers (CWE-693)
- `no-permissive-cors` - Detect wildcard CORS origins (CWE-942)
- `no-cors-credentials-wildcard` - Block credentials: true with wildcard origin (CWE-942)
- `require-express-body-parser-limits` - Require body parser size limits (CWE-770)

#### CSRF & Cookies Rules (2)

- `require-csrf-protection` - Require CSRF middleware for state-changing routes (CWE-352)
- `no-insecure-cookie-options` - Detect missing Secure/HttpOnly cookie attributes (CWE-614)

#### Rate Limiting & DoS Rules (2)

- `require-rate-limiting` - Require rate limiting middleware (CWE-770)
- `no-express-unsafe-regex-route` - Detect ReDoS-vulnerable regex patterns (CWE-1333)

#### GraphQL Rules (1)

- `no-graphql-introspection-production` - Disable GraphQL introspection in production (CWE-200)

#### Presets (4)

- `recommended` - Balanced security defaults
- `strict` - All 9 rules as errors
- `api` - HTTP/API security rules only
- `graphql` - GraphQL-specific rules only

#### Features

- LLM-optimized error messages with CWE references
- OWASP Top 10 2021 alignment (A01, A03, A05, A07)
- Middleware-aware detection (helmet, cors, csurf, express-rate-limit)
- TypeScript support with exported option types
- Comprehensive test coverage (132 tests, 93.15% line coverage)

### Security

- Covers 6 CWEs: 200, 352, 614, 693, 770, 942, 1333
- Maps to OWASP Top 10 2021: A01, A03, A05, A07
