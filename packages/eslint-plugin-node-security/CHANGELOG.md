## [4.1.0] - 2026-05-03

## 4.4.2

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 4.4.1

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 4.4.0

### Minor Changes

- [#190](https://github.com/ofri-peretz/eslint/pull/190) [`6bb476d`](https://github.com/ofri-peretz/eslint/commit/6bb476d232f85da8201b08d0a199c9267c3499e5) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat(node-security): add `no-dynamic-algorithm-selection` (CWE-327)

  Disallow dynamic (non-literal) algorithm names in Node.js crypto functions.
  A runtime-selected algorithm argument can allow a downgrade to a broken or
  risky cryptographic algorithm (CWE-327: Use of a Broken or Risky
  Cryptographic Algorithm). AST-structural — flags non-literal algorithm
  arguments to the crypto APIs.

### Patch Changes

- [#215](https://github.com/ofri-peretz/eslint/pull/215) [`f42ea93`](https://github.com/ofri-peretz/eslint/commit/f42ea935555a558627dd61d1b013cd8509943c89) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Align `no-dynamic-algorithm-selection`'s `meta.docs.cvss` (7.4) to the CVSS its
  finding actually emits. The rule's message carries `CWE-327` and sets no
  per-message `cvss`, so it inherits `CWE_MAPPING['CWE-327']` = 7.5 via
  `enrichFromCWE` — docs now match the emitted value. Surfaced by the
  cross-plugin `security-cvss-docs-consistency.lock.test.ts` lock (added in [#213](https://github.com/ofri-peretz/eslint/issues/213)),
  which turned main red when this rule landed concurrently with the CVSS sweep.
  Documentation-metadata only; no emitted finding changes.

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

## 4.3.0

### Minor Changes

- [#148](https://github.com/ofri-peretz/eslint/pull/148) [`82718c2`](https://github.com/ofri-peretz/eslint/commit/82718c282895710d42c36d4679fb24d47f1c35c7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat(node-security): add `no-math-random-crypto` (CWE-338)

  Detects `Math.random()` used in cryptographic contexts (tokens, keys, secrets,
  salts, IVs, session IDs) and steers to `crypto.randomBytes()` / `crypto.randomUUID()`.

  This was the one cryptography rule that the deprecated `eslint-plugin-crypto`
  shipped but had **not** been carried into `node-security` during the 2026-05
  consolidation — so `eslint-plugin-crypto`'s deprecation notice ("node-security
  includes all cryptography rules") was previously inaccurate. It is now true.

  Added to the `recommended` preset as `error`. The detection is return/assignment
  context-aware (matches `crypto`-named variables, properties, and function
  returns) so benign uses like a Fisher-Yates shuffle into a non-crypto variable
  do not false-positive — verified against the fn-fp benchmark (40/40 detection,
  0 false positives with the crypto-free fleet).

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

- [#141](https://github.com/ofri-peretz/eslint/pull/141) [`38ab670`](https://github.com/ofri-peretz/eslint/commit/38ab670a0221684f4fd3d5dc3c05ddec7458ca2b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: remove false `meta.fixable: 'code'` declarations from 21 rules that had no `fix()` function

  Rules that declared `fixable: 'code'` in their ESLint meta without an actual `fix()` implementation would show the ⚡ auto-fix icon in editors and CI formatters but apply no change when `--fix` was run. This patch removes the misleading declaration from:
  - `browser-security/no-clickjacking`
  - `import-next/first`, `named`, `no-barrel-import`, `no-import-module-exports`, `no-namespace`
  - `node-security/no-buffer-overread`, `no-unsafe-dynamic-require`, `no-zip-slip`
  - `react-features/react-no-inline-functions`
  - `reliability/no-jsdoc-terminator-in-example` (uses `suggest`, not auto-fix; corrected to `hasSuggestions: true` only)
  - `secure-coding/no-directive-injection`, `no-electron-security-issues`, `no-graphql-injection`, `no-improper-sanitization`, `no-improper-type-validation`, `no-ldap-injection`, `no-unchecked-loop-condition`, `no-unlimited-resource-allocation`, `no-weak-password-recovery`, `no-xpath-injection`

- [#186](https://github.com/ofri-peretz/eslint/pull/186) [`edf208d`](https://github.com/ofri-peretz/eslint/commit/edf208d67ac2357312c97d8964fcf6a462e407eb) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Consolidation cleanup — no rule behavior change:
  - **react-features**: the README rules table now lists the 8 `componentApi`
    preset rules. The README generator (`sync-readme-rules.ts`) and the
    `plugin-rule-source-drift` validator now recurse into nested
    `docs/rules/<category>/` subfolders, so every documented rule is advertised
    consistently (previously the nested componentApi docs were silently dropped,
    which an earlier `readme` exception had papered over — that exception is now
    removed in favour of the real fix).
  - **node-security**: remove the orphaned `no-pii-in-logs` rule source — the rule
    was migrated to `eslint-plugin-secure-coding` and is no longer exported here;
    the dead source was still compiling into `dist`.
  - **import-next**: restore the `no-cycle` unit test after [#180](https://github.com/ofri-peretz/eslint/issues/180)'s SCC refactor
    (`computeSCCsFromFile` + `findShortestCyclePath` are now bridged in the mock).

  Also fixes `scripts/ilb-plugin-scope-audit.ts` to stop mis-reading config-preset
  keys (`'recommended-strict': {`) as rules.

- [#148](https://github.com/ofri-peretz/eslint/pull/148) [`82718c2`](https://github.com/ofri-peretz/eslint/commit/82718c282895710d42c36d4679fb24d47f1c35c7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat+fix: ILB-Wild FP reduction + two new quality rules

  **`no-unsafe-deserialization` FP reduction (~112 FPs)**
  - Track `fs.readFileSync('literal')` calls in `literalPathFileVars` — a file read with a
    hardcoded path (bundled config) is not user-controlled input for safe deserializers
    (`JSON.parse`, schema-validating parsers). `eval()` still fires even on literal-path reads.

  **`no-buffer-overread` FP reduction (~129 FPs)**
  - Remove `b` (single-char, too broad) and `chunk` (too common for array chunks) from the
    Buffer alias heuristic — `isBufferType` now only matches `buf` and `bytes` by name,
    reducing false matches on non-Buffer variables.

  **New rule: `modernization/prefer-template-literal`**
  - Flags `"string " + variable` concatenation and suggests the equivalent template literal.
  - Auto-fix produces the correct `` `string ${variable}` `` replacement.
  - Pure string literal chains (`"a" + "b"`) and numeric addition are not flagged.
  - Closes P2 quality FN `prob_string_concat` in the ILB-Arena-Quality bench.

  **New rule: `modularity/no-mutable-exports`**
  - Flags `export let` and `export var` — module exports should be immutable `const`
    bindings so all importers share a stable reference.
  - Auto-fix replaces `let`/`var` with `const`.
  - Closes P2 quality FN `prob_mutable_export` in the ILB-Arena-Quality bench.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Added

- New rule `no-deprecated-buffer` — flags use of the deprecated `Buffer()` constructor (Node.js security advisory; `Buffer.from`/`Buffer.alloc` should be used instead). Enabled in the `recommended` preset at `warn` to avoid breaking adopters with legacy `Buffer()` calls; will be promoted to `error` in the next major.

### Bug Fixes

- `no-zip-slip`: removed redundant dangerous-destination check from the literal handler. Extraction-call handler already reports `dangerousArchiveDestination`; the literal-side check was producing duplicate errors and (separately) firing on unrelated calls like `fs.readFileSync('/etc/app/config')`.
- `lock-file`, `detect-child-process`: minor refinements (see source diff).

## [4.0.4] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))
- resolve all benchmark FN/FP across security rules ([45ffb791](https://github.com/ofri-peretz/eslint/commit/45ffb791))
- **rules:** reduce false positives across security rules ([c192233c](https://github.com/ofri-peretz/eslint/commit/c192233c))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [4.0.3] - 2026-02-06

### Bug Fixes

- ⚠️ **rules:** reduce false positives across security rules ([af4ca0e7](https://github.com/ofri-peretz/eslint/commit/af4ca0e7))
- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ⚠️ Breaking Changes

- **rules:** Some previously flagged patterns are now correctly allowed ([af4ca0e7](https://github.com/ofri-peretz/eslint/commit/af4ca0e7))

### ❤️ Thank You

- Ofri Peretz

## [4.0.2] - 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-node-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [4.0.1] - 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

## [4.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 31 Node.js security rules
- LLM-optimized error messages with CWE references and OWASP mapping
- 100% test coverage across all rules
- ESLint 8 and ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rule Categories

#### Cryptography Rules (12)

- `no-sha1-hash` - Disallow SHA-1 for security-sensitive operations (CWE-328)
- `no-weak-hash-algorithm` - Disallow MD5, SHA-1 for cryptographic hashing (CWE-328)
- `no-ecb-mode` - Disallow ECB mode for block ciphers (CWE-327)
- `no-static-iv` - Disallow static initialization vectors (CWE-329)
- `no-insecure-key-derivation` - Require secure key derivation functions (CWE-916)
- `no-insecure-rsa-padding` - Require OAEP padding for RSA (CWE-780)
- `no-self-signed-certs` - Detect disabled TLS certificate validation (CWE-295)
- `no-timing-unsafe-compare` - Require timing-safe comparison for secrets (CWE-208)
- `no-cryptojs` - Prefer native crypto over CryptoJS (CWE-327)
- `no-cryptojs-weak-random` - Disallow CryptoJS weak random (CWE-338)
- `no-deprecated-cipher-method` - Disallow deprecated crypto methods (CWE-327)
- `prefer-native-crypto` - Prefer Node.js native crypto module

#### File System Rules (7)

- `no-path-traversal` - Prevent path traversal attacks (CWE-22)
- `no-unsafe-file-permissions` - Enforce secure file permissions (CWE-732)
- `no-symlink-attacks` - Prevent symlink-based attacks (CWE-59)
- `require-file-validation` - Require file type validation (CWE-434)
- `no-temp-file-exposure` - Prevent temp file security issues (CWE-377)
- `no-hardcoded-paths` - Prevent hardcoded sensitive paths (CWE-426)
- `require-safe-path-join` - Require path.join for path construction (CWE-22)

#### Process & Shell Rules (6)

- `no-child-process-injection` - Prevent command injection (CWE-78)
- `no-shell-exec` - Disallow shell: true in spawn options (CWE-78)
- `no-env-exposure` - Prevent environment variable exposure (CWE-214)
- `require-process-sanitization` - Require input sanitization for process args (CWE-88)
- `no-unsafe-exec` - Disallow exec with dynamic input (CWE-78)
- `no-eval-alternatives` - Disallow Function constructor, vm runInContext (CWE-95)

#### Network Rules (6)

- `require-tls-verification` - Require TLS certificate validation (CWE-295)
- `no-dns-rebinding` - Prevent DNS rebinding attacks (CWE-350)
- `no-ssrf` - Prevent Server-Side Request Forgery (CWE-918)
- `require-https` - Require HTTPS for external requests (CWE-319)
- `no-unsafe-redirect` - Prevent open redirects (CWE-601)
- `require-host-validation` - Require host header validation (CWE-20)

### Presets

- `recommended` - Balanced security for Node.js applications
- `strict` - All rules as errors
- `crypto` - Cryptography-focused subset
- `filesystem` - File system security subset
- `network` - Network security subset

### Features

- Comprehensive detection patterns for Node.js core modules
- Support for popular libraries (fs-extra, glob, rimraf)
- Auto-fix capabilities where safe
- ESLint MCP integration for AI assistants
