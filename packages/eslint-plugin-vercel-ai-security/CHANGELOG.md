## 1.3.7

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.3.6

### Patch Changes

- [#144](https://github.com/ofri-peretz/eslint/pull/144) [`8843ce7`](https://github.com/ofri-peretz/eslint/commit/8843ce7fbb465caad161b97032467b3a37a49319) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: ILB-Wild FP reduction + doc examples + doc-test-alignment scanner fixes

  **`no-unlimited-resource-allocation` — FP reduction (430 Edge FPs)**
  - Skip loop-allocation reporting when the first argument is a numeric literal (e.g. `Buffer.alloc(1024)` inside a loop is statically bounded, not a risk)
  - Skip `Array.isArray`, `Array.from`, `Array.of` calls in the `alloc/Array` pattern check (these don't allocate unbounded memory)

  **`no-hardcoded-credentials` — FP reduction (~280 Edge FPs)**
  - Extended test-file skip to cover `.fixture.`, `.mock.`, `__mocks__/`, `/tests/`, `/fixtures/`, `/mocks/` paths
  - Skip string literals that are fallback values in `process.env.X || 'fallback'` expressions — the secret lives in the environment, the string is only a dev-mode default

  **Doc examples — 4 rules now have ❌ Incorrect examples**
  - `lambda-security/no-missing-authorization-check`
  - `lambda-security/no-overly-permissive-iam-policy`
  - `node-security/prefer-native-crypto` (renamed non-standard `### ❌ Third-Party (Flagged)` to `### ❌ Incorrect`)
  - `vercel-ai-security/require-tool-confirmation` (replaced placeholder with a real tested example)

  **`ilb-doc-test-alignment` scanner fixes**
  - Accept both `## ❌` and `### ❌` headings (docs use H3 under an H2 `## Examples` section; was only finding H2)
  - Slice from end-of-line rather than end-of-regex-match (prevents `## ❌ Incorrect Code` from leaving a partial heading in the parsed section)

  Result: `ilb:doc-test-alignment` → 206 ok, 0 doc has no ❌ examples (was 165 missing).

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

## 1.3.5 (2026-02-09)

This was a version bump only for eslint-plugin-vercel-ai-security to align it with other projects, there were no code changes.

## [1.3.3] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [1.3.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [1.3.1] - 2026-02-02

This was a version bump only for eslint-plugin-vercel-ai-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-vercel-ai-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2024-12-13

### Added

- **Peer Dependencies**: Added explicit peer dependency requirements:
  - `eslint`: `^8.0.0 || ^9.0.0`
  - `ai` (Vercel AI SDK): `^3.0.0 || ^4.0.0 || ^5.0.0`

### Changed

- Updated README compatibility section to reflect supported versions

---

## [0.2.0] - 2024-12-13

### Added

#### 🔒 New Security Rules (+5)

- **`no-system-prompt-leak`** - Prevent system prompts from being exposed in API responses (LLM07)
- **`no-dynamic-system-prompt`** - Prevent dynamic content in system prompts (ASI01)
- **`require-output-filtering`** - Require filtering of sensitive data in tool output (ASI04)
- **`require-audit-logging`** - Suggest audit logging for AI operations (ASI10)
- **`require-rag-content-validation`** - Validate RAG content before use in prompts (ASI07)

#### ⚙️ New Configuration

- **`minimal`** - Gradual adoption config with only 2 critical rules

#### 📚 Documentation

- Individual documentation for all 15 rules in `/docs/rules/`
- Updated README with complete OWASP coverage tables
- Options documentation for each rule

### Changed

- **Plugin version**: 0.1.0 → 0.2.0
- **Total rules**: 10 → 15
- **Total tests**: 122 → 168
- **OWASP LLM coverage**: 5/10 → 6/10
- **OWASP Agentic coverage**: 5/10 → 9/10

---

## [0.1.0] - 2024-12-13

### Added

#### 🔒 Security Rules (10 Total)

##### Critical Priority

- **`require-validated-prompt`** - Detect unsafe prompts (CWE-74, OWASP LLM01)
- **`no-sensitive-in-prompt`** - Prevent secrets/PII in prompts (CWE-200, OWASP LLM02)
- **`no-hardcoded-api-keys`** - Detect hardcoded API keys (CWE-798, OWASP ASI03)
- **`no-unsafe-output-handling`** - Prevent unsafe output handling (CWE-94, OWASP LLM05/ASI05)

##### High Priority

- **`require-tool-schema`** - Ensure tools have Zod inputSchema (CWE-20, OWASP ASI02)
- **`require-max-tokens`** - Require maxTokens limit (CWE-770, OWASP LLM10)
- **`require-max-steps`** - Require maxSteps for multi-step tool calling (CWE-834, OWASP LLM10)
- **`require-tool-confirmation`** - Require confirmation for destructive tools (CWE-862, OWASP ASI09/LLM06)

##### Medium Priority

- **`require-error-handling`** - Require try-catch for AI calls (CWE-755, OWASP ASI08)
- **`require-abort-signal`** - Require AbortSignal for streaming calls (CWE-404)

#### ⚙️ Configurations

- `recommended` - Balanced security (critical rules as errors, high as warnings)
- `strict` - Maximum security (all rules enabled)

#### 📊 Coverage

- **122 tests passing**
- **98.31% line coverage**
- **100% function coverage**

#### 📚 Documentation

- Comprehensive README with AEO optimization
- AGENTS.md for AI coding assistants
- Full OWASP LLM Top 10 and OWASP Agentic Top 10 mapping

#### Supported Functions

- `generateText` - Full coverage
- `streamText` - Full coverage with abort signal
- `generateObject` - Full coverage
- `streamObject` - Full coverage with abort signal
- `tool()` helper - Schema validation
