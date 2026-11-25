# Design — nestjs-security installs on, and reads, NestJS 12

Intent: [`intent.md`](./intent.md). **Status:** draft.

---

## Requirements

- **R1** The `@nestjs/common` peer range admits `^12.0.0`, and a test fails when
  the installed major is outside the range.
- **R2** `no-missing-validation-pipe` reports a parameter that declares a
  `schema` when `StandardSchemaValidationPipe` runs on neither the parameter,
  the handler, the controller, nor globally (`schemaWithoutPipe`). An options
  object is not a pipe; its `pipes` entries are.
- **R3** `no-res-bypass-serialization` treats
  `StandardSchemaSerializerInterceptor` as a serializer, and reports
  `return Response.json(value)` from a serialized handler when `Response` is the
  global (`webResponseBypassesSerialization`).
- **R4** The project scan does not take `ThrottlerModule.forRoot()` or
  `forRoot([])` for rate limiting.
- **R5** No mutant of `src/rules/**` or `src/utils/*` survives.
- **R6** New releases in the `nestjs` GitHub organisation are listed by one
  command against a committed cursor.

## Design

- R1: `package.json` peer range; `src/peer-range.lock.test.ts` compares it with
  the installed `@nestjs/common` and `@nestjs/throttler` majors.
- R2: `readInputDecorator` in `src/rules/no-missing-validation-pipe/index.ts`
  returns the pipes a parameter decorator carries and whether it declares a
  schema. `usesPipe(decorators, name)` replaces the ValidationPipe-only check.
- R3: a `SERIALIZERS` set, and a selector listener for
  `return Response.<member>(…)` that checks the member, the global binding
  (`isGlobalReference`) and that the enclosing function is a serialized handler.
- R4: a negative lookahead on the `forRoot` pattern in
  `src/utils/project-context.ts`.
- R5: one test per surviving mutant; where no input distinguishes the mutant,
  the redundant check is deleted (`forRoutesArguments` became one sticky regex
  plus a paren counter; `resolveLocalObject` gave way to devkit's
  `resolveObjectLiteral`).
- R6: `scripts/nestjs-release-watch.mts` with its cursor arithmetic in
  `scripts/lib/release-watch.ts`; cursor in `.agent/nestjs-release-watch.json`.
  A scheduled task on the maintainer's machine runs it every three days and
  opens one PR per run; it is not a CI job.

## Verification

- `npx vitest run --config vitest.config.mts` in the plugin: 100% coverage.
- `npm run mutation -- --plugin nestjs-security --force`: 0 survivors.
- `npm run fidelity -- nestjs-security`: the models for R2 and R3 gained a
  `schema` and a `returned` dimension. Removing the `WebJson` clause from the
  serialization model makes fidelity fail with 980 divergences.
- `scripts/__tests__/release-watch.test.ts` for the cursor.

## Rejected alternatives

- **Mutation-disable comments for equivalent mutants.** They hide the redundant
  code that made the mutant equivalent.
- **Reporting `new Response(JSON.stringify(user))`.** The rule already treats a
  value serialized by hand to a string as out of scope for `res.send()`; the
  web-response path follows the same line.
- **A GitHub Actions cron for the release watch.** Turning a release note into
  an intent, a design and a rule needs judgement a workflow step does not have,
  and the repo keeps probes out of PR CI.

## Out of scope

New rules suggested by the same review (request-scoped global guards, upload
limits, validation error disclosure, throttler guard binding). They are a
separate piece of work.
