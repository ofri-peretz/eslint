## [1.2.3] - 2026-02-08

## 1.2.7

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.2.6

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 1.2.5

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

## 1.2.4

### Patch Changes

- [#141](https://github.com/ofri-peretz/eslint/pull/141) [`38ab670`](https://github.com/ofri-peretz/eslint/commit/38ab670a0221684f4fd3d5dc3c05ddec7458ca2b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: remove false `meta.fixable: 'code'` declarations from 21 rules that had no `fix()` function

  Rules that declared `fixable: 'code'` in their ESLint meta without an actual `fix()` implementation would show the ⚡ auto-fix icon in editors and CI formatters but apply no change when `--fix` was run. This patch removes the misleading declaration from:
  - `browser-security/no-clickjacking`
  - `import-next/first`, `named`, `no-barrel-import`, `no-import-module-exports`, `no-namespace`
  - `node-security/no-buffer-overread`, `no-unsafe-dynamic-require`, `no-zip-slip`
  - `react-features/react-no-inline-functions`
  - `reliability/no-jsdoc-terminator-in-example` (uses `suggest`, not auto-fix; corrected to `hasSuggestions: true` only)
  - `secure-coding/no-directive-injection`, `no-electron-security-issues`, `no-graphql-injection`, `no-improper-sanitization`, `no-improper-type-validation`, `no-ldap-injection`, `no-unchecked-loop-condition`, `no-unlimited-resource-allocation`, `no-weak-password-recovery`, `no-xpath-injection`

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))
- resolve all benchmark FN/FP across security rules ([45ffb791](https://github.com/ofri-peretz/eslint/commit/45ffb791))

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

This was a version bump only for eslint-plugin-browser-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-browser-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)

## [1.0.0] - 2025-12-29

### Added

#### XSS Prevention Rules (2)

- `no-innerhtml` - Detect dangerous innerHTML/outerHTML assignments (CWE-79)
- `no-eval` - Detect eval(), new Function(), and string-based callbacks (CWE-95)

#### postMessage Security Rules (3)

- `require-postmessage-origin-check` - Require origin validation in message handlers (CWE-346)
- `no-postmessage-wildcard-origin` - Prevent wildcard targetOrigin in postMessage (CWE-346)
- `no-postmessage-innerhtml` - Prevent XSS via innerHTML in postMessage handlers (CWE-79)

#### Storage Security Rules (4)

- `no-sensitive-localstorage` - Prevent storing sensitive data in localStorage (CWE-922)
- `no-sensitive-sessionstorage` - Prevent storing sensitive data in sessionStorage (CWE-922)
- `no-sensitive-indexeddb` - Prevent storing sensitive data in IndexedDB (CWE-922)
- `no-jwt-in-storage` - Prevent storing JWT tokens in browser storage (CWE-922)

#### Cookie Security Rules (3)

- `no-sensitive-cookie-js` - Prevent storing sensitive data in cookies via JavaScript (CWE-1004)
- `no-cookie-auth-tokens` - Prevent auth tokens in JS-accessible cookies (CWE-1004)
- `require-cookie-secure-attrs` - Require Secure and SameSite cookie attributes (CWE-614)

#### WebSocket Security Rules (3)

- `require-websocket-wss` - Require secure WebSocket connections (wss://) (CWE-319)
- `no-websocket-innerhtml` - Prevent XSS via innerHTML in WebSocket handlers (CWE-79)
- `no-websocket-eval` - Prevent RCE via eval() in WebSocket handlers (CWE-95)

#### File API & Workers Security Rules (4)

- `no-filereader-innerhtml` - Prevent XSS via innerHTML with FileReader data (CWE-79)
- `require-blob-url-revocation` - Require revoking Blob URLs to prevent memory leaks (CWE-401)
- `no-dynamic-service-worker-url` - Prevent dynamic URLs in service worker registration (CWE-829)
- `no-worker-message-innerhtml` - Prevent XSS via innerHTML in Worker message handlers (CWE-79)

#### CSP Security Rules (2)

- `no-unsafe-inline-csp` - Disallow 'unsafe-inline' in CSP (CWE-79)
- `no-unsafe-eval-csp` - Disallow 'unsafe-eval' in CSP (CWE-95)

#### Presets (7)

- `recommended` - Balanced security defaults
- `strict` - All 21 rules as errors
- `xss` - XSS-focused rules only
- `storage` - Storage security rules only
- `postmessage` - postMessage security rules only
- `websocket` - WebSocket security rules only
- `cookies` - Cookie security rules only

#### Features

- LLM-optimized error messages with CWE references
- OWASP Top 10 2021 alignment
- TypeScript support with exported option types
- Comprehensive test coverage (297 tests, 97.73% line coverage)
- Auto-fix suggestions where safe

### Security

- Covers 8 CWEs: 79, 95, 319, 346, 401, 614, 829, 922, 1004
- Maps to OWASP Top 10 2021: A01, A02, A03
