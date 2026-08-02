## [1.4.0] - 2026-05-03

## 1.4.3

### Patch Changes

- [#304](https://github.com/ofri-peretz/eslint/pull/304) [`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - README: call the plugin family "the Interlace eslint-plugins" instead of
  `@interlace/eslint-plugin-*`.

  The plugins publish unscoped — `eslint-plugin-jwt`, not
  `@interlace/eslint-plugin-jwt` — so the scoped form named packages that do not
  exist on npm. This is a docs-only change; no runtime behaviour is affected. It
  ships as a patch so the corrected text reaches the package page on npm.

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

## 1.4.2

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

## 1.4.1

### Patch Changes

- [#155](https://github.com/ofri-peretz/eslint/pull/155) [`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix `patternToRegex` (glob→regex) to escape **all** regex metacharacters, not just `.`. The previous chained `.replace()` left `\ + ( ) | [ ] { } ^ $` to leak through as regex syntax, so an ignore glob such as `a+b` or `(x)` compiled to a quantifier / capture group and matched the wrong files (CWE-116, surfaced by CodeQL `js/incomplete-sanitization`). The wildcard translation (`**`, `*`, `?`) is unchanged; a regression-lock test pins the metacharacter behavior.

### Changed

- Module resolver swapped from `enhanced-resolve` + `get-tsconfig` to [`oxc-resolver`](https://www.npmjs.com/package/oxc-resolver) (Rust NAPI, ~18-30× faster). Per-tsconfig caching for monorepo path-alias correctness across package boundaries.
- `peerDependenciesMeta` no longer lists `enhanced-resolve` and `get-tsconfig` (consumers don't need to peer-provide them; this is **technically breaking** but no consumer impact is expected).

### Added

- `oxc-resolver` is now a hard `dependencies` entry. Note for adopters: NAPI prebuilds cover common targets (Linux x64/arm64 glibc + musl, macOS x64/arm64, Windows x64); rare targets may need to fall back to a build step.

## [1.3.3] - 2026-02-08

This was a version bump only for eslint-devkit to align it with other projects, there were no code changes.

## [1.3.2] - 2026-02-06

This was a version bump only for eslint-devkit to align it with other projects, there were no code changes.

# Changelog

All notable changes to `@interlace/eslint-devkit` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-30

### 🚀 Features

- Enhanced LLM message formatting utilities.
- Improved TypeScript typings for IDE support.

### 🩹 Fixes

- Compatibility fixes for TS strict mode.
- More accurate type guards for AST checking.

### 📌 Notes

- Package name aligned to `@interlace/eslint-devkit` (formerly eslint-plugin-utils).

### ❤️ Thank You

- Ofri Peretz

---

## [0.3.0] - 2025-11-15

### 🚀 Features

- Enhanced type utilities.
- Improved AST helpers.
- Better LLM-oriented error messaging.

### 🩹 Fixes

- Type checking edge cases.
- Documentation improvements.

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.2] - 2025-11-07

### 🩹 Fixes

- Config fixes; removed codecov vite plugin.
- Adjusted ignore patterns in dependency checks.
- Added vitest to peerDependencies.

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.1] - 2025-11-07

### 🩹 Fixes

- Config and dependency-check adjustments.

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.0] - 2025-11-02

Version bump to align packages; no code changes.

---

## [0.1.1] - 2025-11-02

Version bump to align packages; no code changes.

---

## [0.1.0] - 2025-11-02

Initial prerelease for the devkit utilities.
