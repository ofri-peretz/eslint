## 3.3.1

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

## 3.3.0

### Minor Changes

- [#170](https://github.com/ofri-peretz/eslint/pull/170) [`4cbf3ed`](https://github.com/ofri-peretz/eslint/commit/4cbf3ed8aed113f6aed7cef3a2ed060601b927ce) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `recommended-strict` preset + quick-start in README

  **New preset: `configs['recommended-strict']`**
  Same 16-rule set as `recommended` but every rule promoted to `'error'`.
  For teams that want CI to block on all security findings, not just
  critical ones. The recommended preset stays unchanged.

  ```js
  // eslint.config.mjs
  import securePlugin from 'eslint-plugin-secure-coding';
  export default [...securePlugin.configs['recommended-strict']];
  ```

  **README: copy-paste quick-start block**
  Added a one-line usage example immediately after `npm install` so adopters
  don't have to discover the preset table buried further down the page.
  Also added cross-plugin discovery links to `node-security`, `jwt`, and
  `express-security` for teams that want broader coverage.

### Patch Changes

- [#137](https://github.com/ofri-peretz/eslint/pull/137) [`a56da52`](https://github.com/ofri-peretz/eslint/commit/a56da525d90d233310c5329fdd006af5b3fd675c) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(detect-object-injection): suppress ~3,470 Edge false positives via four new safe-pattern guards
  - Test-file skip: rule is now silent on `*.test.*`, `*.spec.*`, `__tests__/`, and `*.fixture.*` paths
  - `for...in` loop variable: keys from `for (const key in obj)` are own property names, not user input
  - `Object.keys/entries` iteration: `for (const key of Object.keys(obj))` is safe by construction
  - Typed-array objects (`new Float32Array/Uint8Array/Int32Array/…`): element access is numeric, not string-keyed

  None of the guards widen the TP surface — dangerous properties (`__proto__`, `constructor`, `prototype`) and genuine user-input bracket access still fire. Closes the largest single source of ILB-Wild noise.

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

## 3.2.0 (Unreleased)

### Added

- New `./oxlint` sub-export for use with [oxlint](https://oxc.rs/docs/guide/usage/linter)'s JS plugin API. Wire it via `{ "jsPlugins": ["eslint-plugin-secure-coding/oxlint"] }` in `.oxlintrc.json`. Exposes the same rule set as the main entry; rules degrade gracefully when type information is unavailable (oxlint's JS plugin context does not provide `parserServices`). The default ESLint entry (`./`) is unchanged.

## 3.1.3 (2026-02-09)

This was a version bump only for eslint-plugin-secure-coding to align it with other projects, there were no code changes.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.1] - 2026-02-09

This was a version bump only for eslint-plugin-secure-coding to align it with other projects, there were no code changes.

## [3.1.0] - 2026-02-09

This was a version bump only for eslint-plugin-secure-coding to align it with other projects, there were no code changes.

## [3.0.3] - 2026-02-09

This was a version bump only for eslint-plugin-secure-coding to align it with other projects, there were no code changes.

## [3.0.2] - 2025-12-20

### Performance

- **detect-object-injection**: Replaced `getText()` + regex with AST-based validation (~4x faster)
- **detect-non-literal-fs-filename**: Replaced `getText()` + regex with AST-based validation
- **no-timing-attack**: Set-based O(1) lookups for sensitive variables and auth patterns
- **no-buffer-overread**: Set-based O(1) lookups for buffer methods and user-controlled keywords
- **no-missing-csrf-protection**: Set-based O(1) lookups for protected HTTP methods
- **detect-child-process**: Set-based O(1) lookups for dangerous child_process methods

## [3.0.1] - 2025-12-20

### Fixed444

- **detect-object-injection**: Reduced false positives by detecting validation patterns:
  - `includes()` checks in enclosing if-blocks
  - `hasOwnProperty()` / `Object.hasOwn()` / `in` operator checks
  - Preceding guard clauses with early exit (`if (!valid) throw`)
  - Numeric index access (`items[0]`, `items[1]`) now recognized as safe
- **detect-non-literal-fs-filename**: Allow safe path patterns:
  - `path.join(__dirname, ...literals)` with all literal arguments
  - Paths validated with `startsWith()` checks (both inside if-blocks and after guard clauses)
- **no-timing-attack**: Skip false positives in timing-safe contexts:
  - Length comparisons before `crypto.timingSafeEqual()`
  - Early returns inside functions using `timingSafeEqual`
  - Fixed file-level sensitive variable detection to be function-scoped
- **no-unsanitized-html**: Track sanitized variables:
  - Variables assigned from `DOMPurify.sanitize()` now recognized as safe
- **no-unlimited-resource-allocation**: Allow safe static paths:
  - `fs.readFileSync(path.join(__dirname, ...literals))` patterns now recognized as safe

## [3.0.0] - 2025-12-14

### Added

- **OWASP Mobile Top 10 Coverage**: Added 40 new rules targeting mobile security risks (M1-M10).
- **New Presets**:
  - `owasp-mobile-top-10`: Comprehensive mobile security ruleset.
- **Documentation**:
  - Full "Mobile Security" table in README with CVSS scores and fixable icons.
  - Updated `AGENTS.md` with complete rule catalog for AI assistants.

### Changed

- **Recommended Config**: Now includes critical mobile security rules for hybrid web/mobile apps.
- **Rule Improvements**: Refined AST detection for `no-clickjacking` and `no-unvalidated-deeplinks` to reduce false positives.

## [1.0.0] - 2025-01-01

### Added

- Initial release with 48 security-focused ESLint rules
- LLM-optimized error messages with [CWE](https://cwe.mitre.org/) references and [OWASP](https://owasp.org/Top10/) mapping
- Three preset configurations: `recommended`, `strict`, `owasp-top-10`
- Full ESLint 9 flat config support
- TypeScript support

### Security Rules

#### Injection Prevention (11 rules)

- `no-sql-injection` - SQL injection prevention
- `database-injection` - Comprehensive SQL/NoSQL/ORM injection
- `detect-eval-with-expression` - Dynamic eval() detection
- `detect-child-process` - Command injection detection
- `no-unsafe-dynamic-require` - Dynamic require() prevention
- `no-graphql-injection` - GraphQL injection prevention
- `no-xxe-injection` - XXE injection prevention
- `no-xpath-injection` - XPath injection prevention
- `no-ldap-injection` - LDAP injection prevention
- `no-directive-injection` - Template injection prevention
- `no-format-string-injection` - Format string injection prevention

#### Path & File Security (3 rules)

- `detect-non-literal-fs-filename` - Path traversal detection
- `no-zip-slip` - Zip slip vulnerability prevention
- `no-toctou-vulnerability` - TOCTOU race condition detection

#### Regex Security (3 rules)

- `detect-non-literal-regexp` - ReDoS detection in RegExp
- `no-redos-vulnerable-regex` - ReDoS pattern detection
- `no-unsafe-regex-construction` - Unsafe regex prevention

#### Object & Prototype (2 rules)

- `detect-object-injection` - Prototype pollution detection
- `no-unsafe-deserialization` - Unsafe deserialization prevention

#### Cryptography (6 rules)

- `no-hardcoded-credentials` - Hardcoded secrets detection
- `no-weak-crypto` - Weak algorithm detection
- `no-insufficient-random` - Weak randomness detection
- `no-timing-attack` - Timing attack prevention
- `no-insecure-comparison` - Insecure comparison detection
- `no-insecure-jwt` - JWT security issues detection

#### Input Validation & XSS (5 rules)

- `no-unvalidated-user-input` - Input validation enforcement
- `no-unsanitized-html` - XSS via innerHTML prevention
- `no-unescaped-url-parameter` - URL parameter XSS prevention
- `no-improper-sanitization` - Output encoding enforcement
- `no-improper-type-validation` - Type confusion prevention

#### Authentication & Authorization (3 rules)

- `no-missing-authentication` - Auth check enforcement
- `no-privilege-escalation` - Privilege escalation detection
- `no-weak-password-recovery` - Secure password reset enforcement

#### Session & Cookies (3 rules)

- `no-insecure-cookie-settings` - Cookie security enforcement
- `no-missing-csrf-protection` - CSRF protection enforcement
- `no-document-cookie` - Direct cookie access detection

#### Network & Headers (5 rules)

- `no-missing-cors-check` - CORS validation enforcement
- `no-missing-security-headers` - Security header enforcement
- `no-insecure-redirects` - Open redirect prevention
- `no-unencrypted-transmission` - HTTPS enforcement
- `no-clickjacking` - Clickjacking prevention

#### Data Exposure (2 rules)

- `no-exposed-sensitive-data` - Data exposure prevention
- `no-sensitive-data-exposure` - Log sanitization enforcement

#### Buffer & Memory (1 rule)

- `no-buffer-overread` - Buffer safety enforcement

#### DoS & Resource (2 rules)

- `no-unlimited-resource-allocation` - Resource limit enforcement
- `no-unchecked-loop-condition` - Infinite loop prevention

#### Platform-Specific (2 rules)

- `no-electron-security-issues` - Electron security enforcement
- `no-insufficient-postmessage-validation` - postMessage validation
