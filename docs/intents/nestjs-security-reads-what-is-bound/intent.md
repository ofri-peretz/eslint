---
slug: nestjs-security-reads-what-is-bound
opened: 2026-11-12
packages:
  - eslint-plugin-nestjs-security
cases:
  - ILB-0169
  - ILB-0170
---

# Intent — nestjs-security reports what is bound, not what is imported

> Stage 1 artifact. Opened after a review of NestJS 11.2.5–12.4.1 produced four
> candidate rules, each checked against the v12.4.1 source and 79 NestJS
> repositories before any was written.

**Status:** shipped · **Opened:** 2026-11-12 · **Owner:** @ofri-peretz

---

## What

Two defences this plugin took on trust are read from the code that enforces them.

- An upload route says how large a file it accepts. `require-upload-size-limit`
  reports a multer interceptor from `@nestjs/platform-express` whose options set
  no `limits.fileSize`.
- `require-throttler` stays quiet for a project only when a `ThrottlerGuard`, or
  a class extending it, is bound app-wide. Importing `ThrottlerModule` is not that.

## Why

Measured on 79 repositories (`tmp/nest-corpus*`), linting `origin/main` against
this branch:

|                                                       |                  count |
| :---------------------------------------------------- | ---------------------: |
| upload interceptor calls                              | 77, in 21 repositories |
| of those, reported (no `fileSize` in reach)           |              40, in 11 |
| repositories calling `ThrottlerModule.forRoot`        |                     21 |
| of those, binding the guard nowhere                   |                      3 |
| of those, binding it on a single route                |                      1 |
| `ThrottlerGuard` subclasses named without "Throttler" |                2 of 11 |
| `require-throttler` findings                          |              160 → 177 |

All 17 new `require-throttler` findings are sensitive routes in two of those four
repositories; the other two have no route the rule considers sensitive.

multer's `fileSize` default is `Infinity`, and `applyDefaultLimits`
(`packages/platform-express/multer/multer/multer.utils.ts`, v12.4.1) adds
defaults for field-name limits only.

## Constraints

- A class is a throttler because of what it extends, read through relative
  imports, `src/…` / `@/…` paths and barrels. Its name is consulted only when
  the class cannot be reached.
- Options the file cannot show — an import, a call, a spread — are not reported.
- `MaxFileSizeValidator` is not a limit: a pipe runs after the interceptor has
  received the file.
- No existing rule's mutation score is re-banked.

## Done when

- `require-upload-size-limit` ships with tests at 100% coverage, a Quint model
  (`npm run fidelity -- nestjs-security/require_upload_size_limit`), a 100%
  mutation score and registry cases ILB-0169 / ILB-0170.
- The `require_throttler` model covers a project that imports the module and
  binds nothing, and one that binds a subclass named without "Throttler".
- `npm run ci:local` passes.

## Rejected

- **Request-scoped global guard.** `scanner.ts` has called
  `getClassScope(useClass)` since v9.0.0, so a class declared request-scoped and
  bound with `useClass` runs; NestJS's own `integration/scopes/src/durable`
  asserts it. What 11.2.8 fixed is a static class whose dependency tree is
  request-scoped, which needs the DI graph. 74 `APP_GUARD useClass` in the
  corpus; one is declared scoped, and it is that integration test.
- **`validationError.target` disclosure.** The built-in exception factory sends
  constraint messages only, on every version. `target` reaches a response only
  through a custom factory, and it is the caller's own body. 234 pipes in 54
  repositories; none sets `target: true`.
