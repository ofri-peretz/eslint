## 1.4.0

### Minor Changes

- [#299](https://github.com/ofri-peretz/eslint/pull/299) [`608defb`](https://github.com/ofri-peretz/eslint/commit/608defbbce6818e2ad4f51d7425e044c4ca04e3e) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Detect the AI SDK v7 `instructions` option, not just the deprecated `system`.

  AI SDK v7 renamed the system-prompt option to `instructions` and marks `system` as
  `@deprecated Use 'instructions' instead` in its own type definitions. Four rules matched
  the property name `system` literally, so on any code written against current AI SDK docs
  they reported nothing at all:

  - `no-dynamic-system-prompt`
  - `require-validated-prompt` (its `unsafeSystemPrompt` branch)
  - `require-rag-content-validation`
  - `no-sensitive-in-prompt`

  All four now accept either spelling via a shared `SYSTEM_PROMPT_PROPS` set, so `system`
  keeps working for pre-v7 code and `instructions` is covered going forward.

  The same pass closed a second silent miss in those rules: a quoted key
  (`{ "instructions": … }`) parses to a string `Literal`, not an `Identifier`, and
  three of the four rules read only `Identifier` keys — so putting quotes round the
  key was enough to stop them firing. Key extraction now goes through a shared
  `getStaticPropName` helper. Three fixtures that recorded this as expected
  behaviour (one labelled "documented FN: only Identifier keys are matched") moved
  from `valid` to `invalid`, since a rule that stops firing on formatting is a miss,
  not a design decision. Computed keys (`{ [k]: … }`) still return `null` — there
  the name genuinely isn't statically known.

  This was found the hard way. Scanning the `nuxt-ui-templates/chat` template, a system
  prompt interpolating the signed-in user's name straight into `instructions:` went
  unreported — the finding was spotted by reading the file, not by the linter that exists to
  catch it. Each of the four rules now carries a regression test that fails if the
  `instructions` spelling is dropped again, and one of them uses the exact template-literal
  shape from that file.

### Patch Changes

- Updated dependencies [[`09d2951`](https://github.com/ofri-peretz/eslint/commit/09d2951b3ac74efc9ba49b64e9089d66800b16cc)]:
  - @interlace/eslint-devkit@1.4.4

## 1.3.10

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

## 1.3.9

### Patch Changes

- [#277](https://github.com/ofri-peretz/eslint/pull/277) [`d1ad332`](https://github.com/ofri-peretz/eslint/commit/d1ad332cc7366887482b288bcf65098d425501d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Accept AI SDK v5+ idioms: `stopWhen` (e.g. `stopWhen: stepCountIs(5)`) now satisfies require-max-steps, and `maxOutputTokens` (v5 rename of `maxTokens`) satisfies require-max-tokens — fixing false positives on v5/v7 code.

## 1.3.8

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

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
