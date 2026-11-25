---
slug: nestjs-nest-v12.5.1-root-module-metadata
opened: 2026-11-17
packages:
  - eslint-plugin-jwt-security
  - eslint-plugin-nestjs-security
cases: []
---

# Intent — Read a JwtModule registered in root-module metadata

> Stage 1 artifact. Opened by the NestJS release watch on reading nest v12.5.1.

**Status:** shipped · **Opened:** 2026-11-17 · **Owner:** @ofri-peretz

---

## What is wanted

`jwt-security/require-expiration` reports `this.jwtService.sign(payload)` when
the package's only `JwtModule.register(...)` sets no `signOptions.expiresIn`,
including when that registration sits in the root-module metadata passed to
`NestFactory.create` in `main.ts` or `bootstrap.ts`. nestjs-security's project
scan keeps finding global guards, pipes, throttlers and upload limits written
in that same metadata, and a test fails if it stops.

## Why now

[nest v12.5.1](https://github.com/nestjs/nest/releases/tag/v12.5.1) ships
[nestjs/nest#18523](https://github.com/nestjs/nest/pull/18523), "accept module
metadata as the root module". Read at the tag, in
`packages/core/nest-factory.ts`:

- lines 53-58: `IEntryNestModule` now includes `ModuleMetadata`, and
  `create(module: IEntryNestModule, ...)` (lines 79-103) takes it.
- lines 272-281: `toRootModule` turns a plain object into
  `class AppModule {}` decorated with `Module(resolved)`.
- lines 283-289: `isModuleMetadata` is any plain object without `module` or
  `forwardRef`.

So `NestFactory.create({ imports: [JwtModule.register({ secret })] })` is a
complete application whose `JwtModule` registration lives in `main.ts`.
`utils/nest-modules.ts` read only `*.module.ts` files. The fixture, a service
calling `this.jwtService.sign({ sub })` beside that `main.ts`, gave **0
reports, expected 1**, on ESLint and on Oxlint
(`npx vitest run --config vitest.config.mts src/rules/require-expiration` in
`packages/eslint-plugin-jwt-security`, before the fix).

The same form was checked against `eslint-plugin-nestjs-security`: its
project scan is text-based over `*.module.ts`, `main.ts` and `bootstrap.ts`,
so a fixture with `APP_GUARD`, `APP_PIPE`, `ThrottlerGuard` and
`MulterModule.register({ limits })` in root metadata already reads all four.
That is no finding, but nothing pinned it.

## Affected users and systems

- `eslint-plugin-jwt-security`, rule `require-expiration` (CWE-613): NestJS
  users on `@nestjs/core` 12.5.1 or later who use the new root form.
- `eslint-plugin-nestjs-security`: a test only, in
  `src/utils/project-context.test.ts`.
- Real code: none of the 83 repositories in the local NestJS corpus uses the
  form yet (the release is a day old), so no published number moves.

## Constraints

- No new dependency.
- No decision from an identifier's name when an AST or import fact is
  available: the registration is still recognised only as a `JwtModule`
  imported from `@nestjs/jwt`. Which files are read is a file-name convention,
  the same one nestjs-security's project scan already uses.
- Type-unaware.
- No change to what is reported for a project without such a `main.ts`.

## Success criteria

- `npx vitest run --config vitest.config.mts` in
  `packages/eslint-plugin-jwt-security` passes at 100% coverage, with the
  `main.ts` and `bootstrap.ts` cases in `require-expiration.test.ts`.
- `npm run fidelity -- jwt-security/require_expiration`: 0 failing, 306/306
  inputs covered.
- `npm run mutation -- --plugin eslint-plugin-jwt-security --rules require-expiration`:
  0 survivors.
- The nestjs-security lock `reads root-module metadata passed to
NestFactory.create in main.ts` fails when `main.ts` is dropped from the scan.

## Open questions

- None blocking. A registration in a bootstrap file with another name
  (`server.ts`, `index.ts`) is still not read; that was already true of an
  `@Module` class declared there and is left as it is.
