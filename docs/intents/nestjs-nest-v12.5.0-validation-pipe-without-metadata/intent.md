---
slug: nestjs-nest-v12.5.0-validation-pipe-without-metadata
opened: 2026-11-13
packages:
  - eslint-plugin-nestjs-security
cases: []
---

# Intent — a ValidationPipe with no parameter types validates nothing

> Stage 1 artifact. Opened by the NestJS release watch on reading nest v12.5.0
> and v11.2.10.

**Status:** draft · **Opened:** 2026-11-13 · **Owner:** @ofri-peretz

---

## What is wanted

A project whose build emits no decorator metadata is told that its
`ValidationPipe` passes every body, query and payload through unvalidated,
unless the pipe is given an `expectedType`.

## Why now

[nest v12.5.0](https://github.com/nestjs/nest/releases/tag/v12.5.0) and
[v11.2.10](https://github.com/nestjs/nest/releases/tag/v11.2.10) add a startup
warning for it
([f433a1f752](https://github.com/nestjs/nest/commit/f433a1f752a899709df39f552bf9f63464ea0d87)).
Read at the v12.5.0 tag, `packages/core/helpers/context-utils.ts`,
`warnOnMissingParamtypes`: when a handler has no `design:paramtypes` and a
`ValidationPipe` without `expectedType` applies to one of its parameters, NestJS
logs `MISSING_HANDLER_METADATA_MESSAGE` (`packages/core/errors/messages.ts`)
once. The commit states the behaviour the warning describes: without the
metatype, `ValidationPipe` "returns the value unchanged". The request is still
served.

`no-missing-validation-pipe` and `require-validation-pipe-whitelist` both treat
the presence of a `ValidationPipe` as validation. Neither reads how the project
is compiled, so a project run with `tsx`, built with esbuild, or compiled with
`emitDecoratorMetadata` off is reported as validated.

No fixture was run: there is no rule input today that carries the compiler
setting, which is the gap.

## Affected users and systems

Users of `eslint-plugin-nestjs-security` whose NestJS application is not built
by the Nest CLI, `tsc` or SWC with decorator metadata on. The project scan
(`src/utils/project-context.ts`) would gain a field.

## Constraints

- No new dependency; type-unaware.
- A project the scan cannot classify is left alone. Reporting a correctly built
  project on every route would get the rule switched off.
- `expectedType` on the pipe is a complete fix and must silence the report.

## Success criteria

- A fixture project with `"emitDecoratorMetadata": false` and a global
  `ValidationPipe` gets one report; the same project with the flag on gets none.
- The corpus scan adds no report on a repository that, read, does emit metadata.
- Plugin tests at 100%, fidelity 0 failing, no surviving mutant.

## Open questions

1. What decides whether metadata is emitted is the tool that runs the code, not
   only `tsconfig.json`: `tsx` and esbuild ignore `emitDecoratorMetadata`, SWC
   reads `.swcrc` (`jsc.transform.decoratorMetadata`), and the Nest CLI can use
   either builder. Which files count as evidence, and what the rule does when
   they disagree, is not settled.
2. `tsconfig.json` uses `extends`, and the flag is often set in a base file,
   sometimes in a package under `node_modules`. How far the scan follows it is
   undecided.
3. Whether this is a report on each handler (noisy, and the fix is one line of
   build configuration) or one report per project, and where a per-project
   report is anchored.
