# Changelog — eslint-plugin-gemini-security

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

### 📝 Documentation

- complete the logo row across every published package (#377) (85e57a7c) — 2026-08-04
