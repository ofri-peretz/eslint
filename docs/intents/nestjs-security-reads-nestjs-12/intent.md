---
slug: nestjs-security-reads-nestjs-12
opened: 2026-11-12
packages:
  - eslint-plugin-nestjs-security
cases: []
---

# Intent — nestjs-security installs on, and reads, NestJS 12

> Stage 1 artifact. Opened after a read of the NestJS releases from 11.2.5 to
> 12.4.1 showed the plugin could not be installed beside NestJS 12 and did not
> know its new validation and serialization API.

**Status:** draft · **Opened:** 2026-11-12 · **Owner:** @ofri-peretz

---

## What

`eslint-plugin-nestjs-security` installs in a NestJS 12 project, its rules give
the right answer on NestJS 12's Standard Schema API and on a returned web
`Response`, no mutant of the plugin survives its tests, and new NestJS releases
are read on a schedule instead of by accident.

## Why

- `npm install -D eslint-plugin-nestjs-security@4.0.1` beside
  `@nestjs/common@^12.4.1` fails with `ERESOLVE`: the peer range stops at
  `^11.0.0`. NestJS 12.0.0 shipped in September 2026.
- `packages/common/pipes/standard-schema-validation.pipe.ts` at `v12.4.1`:
  `if (!schema || !this.toValidate(metadata)) return value;`. A `schema` on
  `@Body()` is metadata; only that pipe enforces it. `no-missing-validation-pipe`
  read the options object as a pipe and stayed silent.
- `packages/common/utils/is-streaming-body.util.ts` at `v12.4.1` returns true for
  `[object Response]`, and both serializers return such a value untouched. A
  handler that returns `Response.json(user)` skips them.
  `no-res-bypass-serialization` looked only at `@Res()`.
- `@nestjs/throttler` 6.7.1 warns at boot that `ThrottlerModule.forRoot()` with
  no throttler limits nothing. The project scan counted it as rate limiting.
- `npm run mutation -- --plugin nestjs-security --force` on `origin/main`:
  67 surviving mutants, 28 of them in `src/utils/project-context.ts`.

## Affected users and systems

Everyone installing the plugin on NestJS 12. The plugin's rule docs and their
generated pages under `apps/docs`. `.agent/mutation-baseline.json`. The fidelity
models under `benchmarks/suites/fidelity/models/nestjs-security/`.

## Constraints

- No new dependency. Rules stay type-unaware where they are today.
- A new report must be silenceable by an option that already exists
  (`assumeGlobalPipes`, `assumeGlobalSerializer`, `assumeGlobalThrottler`).
- No decision from an identifier's name where an AST or import fact is
  available: the web `Response` is recognised by being the unshadowed global.
- No mutation-disable comments; an equivalent mutant is removed by deleting the
  redundant code.

## Done when

- `src/peer-range.lock.test.ts` passes, and fails on the old range.
- `npm run mutation -- --plugin nestjs-security --force` reports 0 survivors and
  every rule and util banked at 100.
- `npm run fidelity -- nestjs-security` reports 10 models, 0 failing.
- `npm run nestjs:releases` prints `[]` straight after a run with `--advance`.

## Open questions

- Whether `ThrottlerModule.forRoot([...])` with no bound `ThrottlerGuard` should
  still count as app-wide rate limiting. Left as it is here.
- With a global pipe registered, the scan cannot tell `ValidationPipe` from
  `StandardSchemaValidationPipe`, so a `schema` under a global `ValidationPipe`
  is not reported.
