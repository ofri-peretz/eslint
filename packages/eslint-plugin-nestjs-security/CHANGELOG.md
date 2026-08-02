## [1.2.3] - 2026-02-08

## 1.3.0

### Minor Changes

- [#287](https://github.com/ofri-peretz/eslint/pull/287) [`5184a12`](https://github.com/ofri-peretz/eslint/commit/5184a1299e2d69f7c9ecbb721a92a543f30af2ce) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Eliminate the false-positive storm on real NestJS codebases. Scanning two
  popular boilerplates with `recommended` produced 582 findings on
  ack-nestjs-boilerplate and 109 on brocoders/nestjs-boilerplate; after this
  change they produce 0 and 11, and every remaining finding is a genuine gap
  (an unauthenticated file-download route, entities exposing `password`/`hash`,
  unvalidated request-DTO properties, and one missing `ThrottlerModule`).

  - **Cross-file global registration is now detected.** Guards, pipes and rate
    limiting registered through DI (`{ provide: APP_GUARD | APP_PIPE |
APP_INTERCEPTOR, ... }`), through `app.useGlobalPipes()` /
    `app.useGlobalGuards()`, or through `ThrottlerModule.forRoot(Async)` suppress
    the corresponding per-controller findings. The project root is resolved from
    the linted file and its module files are scanned once and cached. A
    `ThrottlerGuard` registered as `APP_GUARD` counts as rate limiting, not
    authentication. Opt out per rule with `detectGlobalGuards` /
    `detectGlobalPipes: false`.
  - **`require-guards`** no longer asserts "unguarded" on a route carrying a
    decorator it cannot resolve — projects wrap `@UseGuards` in composites such as
    `@AuthJwtAccessProtected()` via `applyDecorators()`. It also stops reporting
    credential-issuing routes (`login`, `register`, `forgotPassword`,
    `resetPassword`, `confirmEmail`, `refresh`, health checks, webhooks), which
    cannot require the credential they hand out. New options:
    `allowCustomDecorators`, `detectGlobalGuards`, `publicRoutePatterns`.
    `requiredGuards` — documented since 1.0 but never read — is now actually
    enforced: with it set, `@UseGuards(RolesGuard)` no longer satisfies
    `requiredGuards: ['JwtAuthGuard']`, and the new `missingRequiredGuards`
    message names the guards that would. Guard arguments are read syntactically
    (`AuthGuard('jwt')`, `guards.JwtAuthGuard`); anything with no static name,
    an unresolved composite decorator, or a global `APP_GUARD` still suppresses
    the report, since none of them can be proven _not_ to apply the guard.
  - **`require-throttler` now reports once per project, on the root module**,
    instead of once per route handler. Rate limiting is adopted with a single
    `ThrottlerModule` registration, so 24 (and 93) per-route errors described a
    one-line fix. New options: `rootModuleNames`, `rootModuleFiles`; `skipRoutes`
    is deprecated and ignored. In-file detection requires an actual registration
    (`ThrottlerModule` in `imports`, or a `ThrottlerGuard` behind `APP_GUARD`) —
    a bare `import { ThrottlerGuard }` no longer silences the rule.
  - **`no-missing-validation-pipe`** honours parameter-bound pipes
    (`@Body(new ValidationPipe())`, `@Param('id', ParseIntPipe)`) and globally
    registered pipes.
  - **`require-class-validator`** no longer fires on response/serialization DTOs
    (name pattern, superclass name, or class-transformer `@Expose`/`@Exclude`),
    on `format: 'binary'` multipart upload slots, or on `@Allow()`-marked
    properties, and recognises ~40 more class-validator decorators. New options:
    `checkResponseDtos`, `responseDtoPattern`.
  - **`no-exposed-private-fields`** is scoped to persistence entities and domain
    models. A `LoginResponseDto` carrying a token is a declared contract; an
    `@Entity()` exposing `password` without `@Exclude()` is an accident. New
    option: `includeDtos` restores the previous behaviour. GraphQL `@InputType()`
    / `@ArgsType()` classes follow `includeDtos` too — they are request contracts
    (`LoginInput` must carry a password); `@ObjectType()` stays an entity.
  - **`no-exposed-debug-endpoints`** inspects route paths only, instead of every
    string literal in the file (it was flagging enum members, seed data and config
    values). `admin`, `test` and `health` are no longer default debug paths, and a
    guarded debug route is no longer reported. New option: `detectGlobalGuards`.

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

## 1.2.6

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 1.2.5

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.2.4

### Patch Changes

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

This was a version bump only for eslint-plugin-nestjs-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-nestjs-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-29

### Added

#### Authorization & Access Control Rules (2)

- `require-guards` - Require @UseGuards decorator on controllers/handlers (CWE-284)
- `no-exposed-private-fields` - Detect exposed sensitive fields in DTOs/entities (CWE-200)

#### Input Validation Rules (2)

- `no-missing-validation-pipe` - Require ValidationPipe for DTO parameters (CWE-20)
- `require-class-validator` - Require class-validator decorators on DTO properties (CWE-20)

#### Rate Limiting & DoS Rules (1)

- `require-throttler` - Require ThrottlerGuard/@Throttle for rate limiting (CWE-770)

#### Presets (2)

- `recommended` - Balanced security defaults
- `strict` - All 5 rules as errors

#### Features

- LLM-optimized error messages with CWE references
- OWASP Top 10 2021 alignment (A01, A03, A05)
- Decorator-aware detection (@UseGuards, @UsePipes, @Throttle, @Exclude)
- `assumeGlobal*` options for teams using global configuration
- Support for public/skip decorators (@Public, @SkipAuth, @AllowAnonymous, @SkipThrottle)
- TypeScript support
- Comprehensive test coverage (79 tests, 96.09% line coverage)

### Security

- Covers 4 CWEs: 20, 200, 284, 770
- Maps to OWASP Top 10 2021: A01, A03, A05
