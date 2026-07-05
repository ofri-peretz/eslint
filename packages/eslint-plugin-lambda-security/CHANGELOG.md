## [1.2.3] - 2026-02-08

## 1.2.5

### Patch Changes

- [#220](https://github.com/ofri-peretz/eslint/pull/220) [`ad8416d`](https://github.com/ofri-peretz/eslint/commit/ad8416d4db196bf0b24942ddabbfaefb0cae7bab) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix runtime crashes when linting realistic AWS Lambda handlers under ESLint 9.

  The published `1.2.3` tarball was a **stale build**: its rules still threw on the
  generated lambda-ai-corpus handlers, even though source had already been fixed.
  This republishes the corrected build and locks it with a regression test.
  - **`no-error-swallowing`** no longer throws `RangeError: Maximum call stack size
exceeded`. The old build walked the catch-block AST by hand and recursed through
    the cyclic `node.parent` reference; source now uses `sourceCode.getText()` + a
    regex.
  - **`require-timeout-handling`**, **`no-missing-authorization-check`**, and
    **`no-unbounded-batch-processing`** no longer throw `Error: Unknown class name:
exit`. They used a grouped `:exit` selector (`'A:exit, B:exit, C:exit'`); ESLint
    only strips the trailing `:exit`, so esquery received a bare `:exit`. Source now
    uses one listener key per node type.
  - `plugin.meta.version` is now read from `package.json` instead of a hardcoded
    string, so a build can no longer mislabel its own version (1.2.3 embedded
    `1.1.0`).

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

- [#194](https://github.com/ofri-peretz/eslint/pull/194) [`55d5c0a`](https://github.com/ofri-peretz/eslint/commit/55d5c0ab90bfaaecf01be5146a91a2e4b14e1d41) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix a hard crash (`Error: Unknown class name: exit`) that aborted the entire ESLint run on ESLint 9 whenever the `recommended` or `strict` config was enabled.

  Three rules — `require-timeout-handling`, `no-missing-authorization-check`, and `no-unbounded-batch-processing` — registered their function-exit listener as a single comma-joined selector key:

  ```
  'ArrowFunctionExpression:exit, FunctionExpression:exit, FunctionDeclaration:exit'
  ```

  ESLint only strips a **trailing** `:exit` before handing a selector to esquery, so the earlier `:exit` tokens survived into the parser and threw `Unknown class name: exit` for every linted file. Each listener is now registered as one key per node type, which is the only esquery-safe form.

  A config-level regression test (`src/index.test.ts`) now boots the real ESLint engine against both shipped configs, so any future comma-joined `:exit` — or any other unparseable selector in any rule — fails in CI instead of in a consumer's editor.

  `@interlace/eslint-config` re-exports the `recommended` config and is republished against the fixed plugin.

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

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

This was a version bump only for eslint-plugin-lambda-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-lambda-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-29

### Added

#### Credential & Secrets Protection Rules (3)

- `no-hardcoded-credentials-sdk` - Detect hardcoded AWS credentials in SDK v3 clients (CWE-798)
- `no-secrets-in-env` - Detect secrets hardcoded in environment variables (CWE-798)
- `no-env-logging` - Detect logging entire process.env object (CWE-532)

#### CORS Security Rules (2)

- `no-permissive-cors-response` - Detect wildcard CORS in Lambda response headers (CWE-942)
- `no-permissive-cors-middy` - Detect permissive CORS in @middy/http-cors middleware (CWE-942)

#### Presets (2)

- `recommended` - Balanced security defaults
- `strict` - All 5 rules as errors

#### Features

- LLM-optimized error messages with CWE references
- OWASP Serverless Top 10 alignment (SAS-2, SAS-3, SAS-4)
- AWS SDK v3 client detection (S3, DynamoDB, Lambda, STS, etc.)
- Middy middleware detection (@middy/http-cors)
- Real AWS access key pattern matching (AKIA*, ASIA*)
- TypeScript support with exported option types
- Comprehensive test coverage (78 tests, 97.40% line coverage)
- Auto-fix for CORS violations

### Security

- Covers 3 CWEs: 532, 798, 942
- Maps to OWASP Serverless Top 10: SAS-2, SAS-3, SAS-4
