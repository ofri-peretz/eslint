## [3.0.5] - 2026-02-08

## 3.0.11

### Patch Changes

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

- Updated dependencies [[`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5), [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358)]:
  - @interlace/eslint-devkit@1.4.3

## 3.0.10

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 3.0.9

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 3.0.8

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 3.0.7

### Patch Changes

- [#200](https://github.com/ofri-peretz/eslint/pull/200) [`02e0baf`](https://github.com/ofri-peretz/eslint/commit/02e0baf7a4e8ba83e8b2ec2b82169f733e4f4d87) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: republish `recommended` preset with the correct plugin namespace

  The published builds of `eslint-plugin-maintainability` and
  `eslint-plugin-operability` shipped a `recommended` config whose plugin KEY
  (`@interlace/maintainability`) did not match its rule PREFIX
  (`@interlace/maintainability/maintainability/…` — doubled). ESLint cannot
  resolve that, so spreading `...configs.recommended` throws
  "could not find plugin" the moment a consumer lints a file — under both
  ESLint 9 and 10.

  The source was corrected in the 2026-05-16 namespace cleanup (alongside
  `react-features`, which has since been republished via other changesets), but
  these two plugins were never bumped — so npm still serves the broken builds and
  they are the only two doubled-namespace plugins still unfixed downstream. This
  republishes them from the corrected source.

  Regression lock: `packages/eslint-config-interlace/src/ecosystem-integrity.test.ts`
  loads every plugin's every config preset into a real ESLint instance and fails
  if any rule→plugin reference cannot be resolved. Run it against the built
  `dist/` in the release pipeline (pre-publish) to also catch a stale-artifact
  publish — the failure mode that let these two ship broken.

## 3.0.6

### Patch Changes

- [#197](https://github.com/ofri-peretz/eslint/pull/197) [`ecb8491`](https://github.com/ofri-peretz/eslint/commit/ecb849121833bf63b00256fa837f329bb721fbac) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: republish `recommended` with correctly-namespaced, unscoped rule ids

  `eslint-plugin-maintainability@3.0.3` and `eslint-plugin-operability@3.0.5`
  shipped a `recommended` preset whose rule ids carried a doubled, scoped plugin
  segment (`@interlace/maintainability/maintainability/cognitive-complexity`)
  that no registered plugin key matched. Enabling the preset alongside any other
  config made ESLint throw at load:

  ```text
  Could not find plugin "@interlace/maintainability/maintainability".
  ```

  (and the equivalent `@interlace/operability/operability` for operability.)

  The source was already corrected to the bare, unscoped form
  (`maintainability/cognitive-complexity` under a `maintainability` plugin key)
  but was never republished, so npm still served the broken build. This release
  ships the corrected build. `plugin.meta.name` is also fixed to the unscoped
  `eslint-plugin-maintainability` (was `@interlace/eslint-plugin-maintainability`,
  which drifted from the package name and every other plugin).

  Each plugin is configured on its own — there is no unified config. No rule
  behaviour changes.

  New regression locks in each plugin's `index.test.ts` reproduce ESLint's rule-id
  resolution, pin the plugin name and key as unscoped, and load each `recommended`
  preset in a real ESLint instance — failing closed if a scoped or doubly
  namespaced config could ship again.

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [3.0.4] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [3.0.3] - 2026-02-02

This was a version bump only for eslint-plugin-operability to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-operability` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [3.0.2] - 2026-02-02

This was a version bump only for eslint-plugin-operability to align it with other projects, there were no code changes.

## [3.0.1] - 2026-02-02

This was a version bump only for eslint-plugin-operability to align it with other projects, there were no code changes.

## [3.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-operability to align it with other projects, there were no code changes.

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 6 production-readiness rules
- LLM-optimized error messages for AI-assisted development
- 100% test coverage across all rules
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rules

| Rule                          | Description                                      | 💼  | ⚠️  |
| :---------------------------- | :----------------------------------------------- | :-: | :-: |
| `no-console-log`              | Disallow `console.log` in production code        | 💼  | ⚠️  |
| `no-process-exit`             | Disallow `process.exit()` in library code        |     |     |
| `no-debug-code-in-production` | Detect `debugger` statements and debug keywords  | 💼  |     |
| `no-verbose-error-messages`   | Prevent overly detailed error messages (CWE-209) | 💼  | ⚠️  |
| `require-code-minification`   | Detect patterns that prevent minification        |     |     |
| `require-data-minimization`   | Detect excessive data exposure in responses      |     |     |

### Presets

- `recommended` - Balanced operability checks for production code

### Security

- `no-verbose-error-messages` prevents information exposure (CWE-209)
- `require-data-minimization` enforces data protection principles

### Jan 2026 Remediation

- Converted skeleton documentation to high-fidelity guides
- Added comprehensive examples for all rules
- Documented known limitations in `docs/KNOWN-LIMITATIONS.md`
