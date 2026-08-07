# Changelog — eslint-plugin-openai-security

## 0.3.1

### Patch Changes

- [#407](https://github.com/ofri-peretz/eslint/pull/407) [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the declared ESLint floor: `^8.0.0` → `^8.40.0`.

  `context.sourceCode` landed in ESLint 8.40. The shared devkit reads it without a
  fallback and 20 plugins read it directly, so on ESLint 8.0–8.39 the install
  resolved cleanly and then every rule threw
  `Cannot read properties of undefined (reading 'ast')` at lint time — npm reported
  nothing, because the manifest claimed the version was supported.

  Measured on 8.0.0 / 8.39.0 (throw on load) versus 8.40.0 / 8.57.1 / 9.0.0 /
  9.39.2 / 10.8.0 (all produce the expected finding). No runtime behaviour
  changes; this only makes the manifest match what the code can actually run.

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 0.3.0

### Minor Changes

- [#406](https://github.com/ofri-peretz/eslint/pull/406) [`7663cfd`](https://github.com/ofri-peretz/eslint/commit/7663cfda0d2c41b4c7dc0b4c680550cb74a27faa) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - New rule `no-untrusted-content-in-prompt` (CWE-1427) on all three raw inference
  SDKs, from a shared `createSystemPromptInjectionRule` factory.

  A system prompt is instruction text: whatever is spliced into it is read by the
  model as instructions rather than as data, so anyone who controls that value
  controls the agent. The rule reports a system prompt that is not static, in both
  shapes the raw SDKs use — the named option (`system`, `instructions`,
  `systemInstruction`) and the `messages: [{ role: 'system', content }]` array.

  A bare identifier counts as static. `system: SYSTEM_PROMPT` is the correct
  pattern and by far the most common one; following it is the data-flow analysis
  these rules avoid.

  **`strict` only.** Unlike the credential rules, this one has a genuine
  false-positive shape — a system prompt interpolating today's date is not an
  injection and the rule cannot tell the difference. Promotion to `recommended`
  waits on the corpus measurement.

  Gating is by qualified member path (`messages.create`, `completions.create`,
  `generateContent`), not by leaf method name. `create` alone is shared across
  these SDKs, and matching on it made a file importing two of them report one line
  twice. `vercel-ai-security/no-dynamic-system-prompt` keeps the bare-function
  `generateText(...)` form, which has no member path at all — verified by linting
  a file that imports all four SDKs and uses every shape: no line is reported
  twice.

### Patch Changes

- [#411](https://github.com/ofri-peretz/eslint/pull/411) [`d0cc8b6`](https://github.com/ofri-peretz/eslint/commit/d0cc8b647a41c1a85950c87a60296ece0f3abc31) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Ship the JavaScript without tsc's layout.

  Every emitted `.js` is re-written through esbuild's `minifyWhitespace`, which
  removes indentation and line breaks. Across the ecosystem that is 3233 kB ->
  2023 kB of shipped JavaScript, a 37% cut; on disk a package install drops about
  28%. Indentation alone was ~32% of a compiled rule file.

  This is deliberately NOT minification. Identifiers keep their names, string
  contents are untouched, and the syntax tree is not rewritten — rule `meta`
  (messages, schema, docs URLs) stays byte-identical, which is what the docs site
  and `--print-config` read, and a stack trace from inside a rule still names
  the function it came from. Full mangling would have bought another 4 kB gzipped
  and cost both.

  Verified against the published artifact: identical lint findings including
  message IDs, identical rule names, and zero differences across every rule's
  meta, messages, schema and presets.

- Updated dependencies [[`7663cfd`](https://github.com/ofri-peretz/eslint/commit/7663cfda0d2c41b4c7dc0b4c680550cb74a27faa), [`d0cc8b6`](https://github.com/ofri-peretz/eslint/commit/d0cc8b647a41c1a85950c87a60296ece0f3abc31)]:
  - @interlace/eslint-devkit@1.10.0

## 0.2.0

### Minor Changes

- [#402](https://github.com/ofri-peretz/eslint/pull/402) [`5980f89`](https://github.com/ofri-peretz/eslint/commit/5980f89a65113e43d504ecc72a86d61aa1e522cb) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-hardcoded-api-key` now covers all three raw inference SDKs.

  The rule shipped on `eslint-plugin-anthropic-security` only. Its detection moved
  into a shared `createSdkApiKeyRule` factory in `@interlace/eslint-devkit` and is
  now instantiated for OpenAI and Gemini as well, at the same severity in every
  preset — one rule with three module gates rather than three separate ones that
  could drift.

  Gemini adds a shape the other two do not have: the legacy
  `new GoogleGenerativeAI(apiKey)` client takes the key as a **positional**
  argument, with no options object to inspect. Both that and the current
  `new GoogleGenAI({ apiKey })` form are checked.

  Module matching is exact-or-subpath, not a prefix: `openai` opens the gate for
  `openai` and `openai/resources`, and deliberately not for `openai-edge`, which
  is a different package with a different client.

  Anthropic's behaviour and its reported messages are unchanged; only the
  implementation moved.

### Patch Changes

- [#403](https://github.com/ofri-peretz/eslint/pull/403) [`6f5f164`](https://github.com/ofri-peretz/eslint/commit/6f5f164c7461d66f17689039d19fa9d7d84111ef) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-browser-api-key-exposure` now covers the Anthropic SDK too.

  The rule shipped on `eslint-plugin-openai-security` only. Its detection moved
  into a shared `createBrowserEscapeHatchRule` factory in
  `@interlace/eslint-devkit`, and `eslint-plugin-anthropic-security` gains the
  rule at `error` in every preset.

  Both SDKs refuse to run in a browser by default and both unlock it with the
  same `dangerouslyAllowBrowser` flag; the Anthropic SDK's own JSDoc says
  client-side use "risks exposing your secret API credentials to attackers".

  **Two instantiations, not three.** Verified against the published tarballs
  rather than assumed: neither `@google/generative-ai@0.24` nor
  `@google/genai@2.15` has a browser escape hatch, because neither refuses the
  browser in the first place. There is no flag to detect and no structural signal
  a linter can read without knowing whether a file ships to a client, so
  `eslint-plugin-gemini-security` does not get this rule. Inventing a fuzzy third
  detection would report correct code.

  OpenAI's behaviour and its reported messages are unchanged; only the
  implementation moved.

- Updated dependencies [[`6f5f164`](https://github.com/ofri-peretz/eslint/commit/6f5f164c7461d66f17689039d19fa9d7d84111ef), [`5980f89`](https://github.com/ofri-peretz/eslint/commit/5980f89a65113e43d504ecc72a86d61aa1e522cb), [`81acd9c`](https://github.com/ofri-peretz/eslint/commit/81acd9ca270940529b455fbfa685b842b8cfe982), [`8e238ea`](https://github.com/ofri-peretz/eslint/commit/8e238ea3a7f18aa47c6d02368c6023d8575deca4), [`0cbcc46`](https://github.com/ofri-peretz/eslint/commit/0cbcc46f89258c888de7354cf24b90c316df43b0)]:
  - @interlace/eslint-devkit@1.9.0

## 0.1.1

### Patch Changes

- [#377](https://github.com/ofri-peretz/eslint/pull/377) [`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Complete the logo row across every published package.

  The six AI SDK family plugins landed after the logo row shipped, so they had no
  marks; @interlace/eslint-devkit never had a header row at all. All of them now
  carry Interlace -> ecosystem -> oxlint -> ESLint (devkit has no ecosystem mark).

  The four AI SDK READMEs are also brought to the canonical structure they were
  missing: Philosophy, Getting Started, Configuration Presets, Compatibility,
  Related Plugins, and the 11-column rule table with the type-awareness column.

  README-only change; no rule behaviour is affected. The patch bump is what
  carries the new README onto npm, which only refreshes a package README on
  publish.

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix the `./oxlint` subpath export, which pointed at `src/oxlint.js` — a file no build produces. `require('<package>/oxlint')` threw MODULE_NOT_FOUND on every published package, while every README documented that exact wiring for oxlint's `jsPlugins`. The export now points at the build output, `dist/src/oxlint.js`.

  The path was hardcoded in `scripts/generate-oxlint-shims.ts`, so the generator rewrote any manual correction back to the broken value on the next drift check — fixed there rather than per package.

  This release also carries npm provenance: the affected packages were last published from a workstation, which has no OIDC token to attest with, so the published tarballs had no attestation. Publishing through the release workflow signs them.

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix SDK peer declarations that npm silently ignored

  Twelve plugins listed their target SDKs under `peerDependenciesMeta` with
  `{"optional": true}` but never declared them in `peerDependencies`. npm drops
  any `peerDependenciesMeta` entry that has no matching `peerDependencies` key,
  so the metadata was inert — these packages effectively declared **no SDK peer
  at all**. Nothing warned: the failure mode of a dependency you never declared
  is silence.

  Each SDK now appears in both maps, matching the shape `eslint-plugin-pg` and
  `eslint-plugin-mongodb-security` already use — a supported major range in
  `peerDependencies`, `optional: true` in `peerDependenciesMeta`:

  | Plugin               | SDK                              | Range                                        |
  | :------------------- | :------------------------------- | :------------------------------------------- |
  | `express-security`   | `express`                        | `^4.0.0 \|\| ^5.0.0`                         |
  |                      | `helmet`                         | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`             |
  |                      | `cors`                           | `^2.0.0`                                     |
  |                      | `csurf`                          | `^1.0.0`                                     |
  |                      | `express-rate-limit`             | `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` |
  | `jwt`                | `jsonwebtoken`                   | `^8.0.0 \|\| ^9.0.0`                         |
  |                      | `@nestjs/jwt`                    | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `express-jwt`                    | `^7.0.0 \|\| ^8.0.0`                         |
  |                      | `jose`                           | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `jwks-rsa`                       | `^3.0.0 \|\| ^4.0.0`                         |
  |                      | `jwt-decode`                     | `^3.0.0 \|\| ^4.0.0`                         |
  | `lambda-security`    | `@aws-sdk/client-lambda`         | `^3.0.0`                                     |
  |                      | `@middy/core`                    | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-cors`               | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-security-headers`   | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/validator`               | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  | `maintainability`    | `typescript`                     | `>=4.8.4`                                    |
  | `nestjs-security`    | `@nestjs/common`                 | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `@nestjs/throttler`              | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `class-validator`                | `^0.14.0 \|\| ^0.15.0`                       |
  |                      | `class-transformer`              | `^0.5.0`                                     |
  | `react-features`     | `typescript`                     | `>=4.8.4`                                    |
  | `vercel-ai-security` | `ai`                             | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  | `jwt-security`       | same six as `jwt`                | (identical ranges)                           |
  | `openai-security`    | `openai`                         | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@openai/agents`                 | `>=0.1.0 <1.0.0`                             |
  | `anthropic-security` | `@anthropic-ai/sdk`              | `>=0.1.0 <1.0.0`                             |
  |                      | `@anthropic-ai/claude-agent-sdk` | `>=0.1.0 <1.0.0`                             |
  | `gemini-security`    | `@google/genai`                  | `^1.0.0 \|\| ^2.0.0`                         |
  | `mcp-sdk-security`   | `@modelcontextprotocol/sdk`      | `^1.0.0`                                     |

  Ranges were taken from each SDK's real release history, bounded below by the
  oldest major whose call shape the rules still match and above by the current
  major. `cors`, `csurf`, `class-transformer` and `@aws-sdk/client-lambda` have
  only ever shipped one usable major. The `ai` range spans v4 because
  `require-max-steps` deliberately accepts both the v4 `maxSteps` option and the
  v5+ `stopWhen` form. The two `typescript` entries reuse the `>=4.8.4` bound
  `@interlace/eslint-devkit` already declares, since these are the same
  type-aware-graceful rules behind the same optional TS program.

  Every range admits the version this repo's `__compatibility__` specs are
  actually tested against, so the declaration cannot drift from what CI proves.

  The four SDKs still on `0.x` (`@openai/agents`, both Anthropic packages) use an
  explicit `>=0.1.0 <1.0.0` rather than a caret, because `^0.115.0` resolves to
  `>=0.115.0 <0.116.0` — a range narrow enough to warn on almost every real
  install. These rules match on call shape and never import the SDK, so the
  honest constraint is the pre-1.0 line, not a single minor.

  `peer-declaration-integrity.test.ts` now locks the invariant across every
  workspace package: a `peerDependenciesMeta` key with no `peerDependencies` twin
  fails the suite and is named in the diff. This class had already been fixed
  once, in a commit that never merged — nothing went red in its absence, so the
  bug came back on four newly published packages. A silent failure needs a lock,
  not review attention.

  **Nothing to migrate.** Every entry stays optional, so no install adds a
  package or emits a warning when the SDK is absent. What changes is that a
  consumer on an unsupported major now gets a peer warning instead of nothing —
  which was the point of the metadata in the first place.

- Updated dependencies [[`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b), [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98), [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae), [`1fb1cad`](https://github.com/ofri-peretz/eslint/commit/1fb1caddf8e5c20d43de9cede5d66565b297bee6), [`d1a3d8c`](https://github.com/ofri-peretz/eslint/commit/d1a3d8c62778ed027a8c522a3cf9b12a3b1c90b9)]:
  - @interlace/eslint-devkit@1.8.0

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://www.conventionalcommits.org) for commit guidelines.

## 0.1.0 (2026-08-05)

### ✨ Features

- AI SDK security family + fix the broken oxlint export (#335) (47cde07f) — 2026-08-04
- add component-specific Codecov badges to all README files (b71ce728) — 2025-12-29

### 🐛 Bug Fixes

- ignore plugin entry points (src/index.ts) from coverage (27c69e12) — 2025-12-29
- change include pattern from 'src/rules/**/index.ts' to 'src/**/*.ts' (dccfc0fc) — 2025-12-29
- update Codecov workflow to use CLI upload-process (60dd38cb) — 2025-12-29
- make Codecov workflow resilient for monorepo (9daece7f) — 2025-12-29
- add correct peer dependencies for eslint and ai sdk (c9cbc866) — 2025-12-13

### 📝 Documentation

- complete the logo row across every published package (#377) (85e57a7c) — 2026-08-04

### 🔧 Chores

- remove eslint-plugin-openai-security package and its tsconfig alias (69c4cd92) — 2025-12-29
- add MIT license and standard .npmignore files to various ESLint plugins (89f6ba76) — 2025-12-29
