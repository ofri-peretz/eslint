# Design — a ValidationPipe with no parameter types validates nothing

Intent: [`intent.md`](./intent.md). **Status:** approved.

---

## Requirements

- **R1** The project scan records whether decorator metadata is emitted:
  `yes`, `no`, or `unknown`.
- **R2** When it is `no` and a `ValidationPipe` without `expectedType` is the
  validation a rule would accept, the project gets a report.
- **R3** `unknown` reports nothing.
- **R4** `new ValidationPipe({ expectedType: Dto })` on the parameter is accepted.

## Design

Sketch only; the intent's open questions decide its shape.

`scanProject()` in `packages/eslint-plugin-nestjs-security/src/utils/project-context.ts`
first classifies the tool that runs the code, from `package.json` scripts and
config files: `nest`/`tsc` (reads `tsconfig.json`, plus `tsconfig.build.json`
when present), SWC (reads `.swcrc` `jsc.transform.decoratorMetadata`, which
emits metadata whatever `tsconfig.json` says), `tsx`/esbuild (emit none
whatever the flag says). It then sets `emitsDecoratorMetadata`: `no` only when
the tool is classified and its own setting establishes no metadata (a readable
`tsconfig.json` with no `extends` that leaves the flag off under `tsc`, any
`tsx`/esbuild entry). Several tools, an unrecognised one, or an unreadable
setting is `unknown`.

New report, in `no-missing-validation-pipe`: `validationPipeWithoutMetadata`, on
`app.useGlobalPipes(new ValidationPipe())` in the bootstrap file, or on the
`APP_PIPE` provider. One report per registration, not per handler.

Parameter-scoped validation (R4): a parameter decorated
`@Body(new ValidationPipe({ expectedType: Dto }))` is validated after the global
pipe, whatever the metadata. The rule reads each controller file it lints; the
registration report stays, because the scan cannot see every handler at once,
but each handler whose body/query/param arguments all carry such a pipe gets no
per-handler finding, and the report's text names the per-parameter pipe as the
fix. A project that validates every parameter that way silences the
registration with `assumeDecoratorMetadata`; the docs say so.

```ts
// tsconfig.json: { "compilerOptions": { "experimentalDecorators": true } }
app.useGlobalPipes(new ValidationPipe({ whitelist: true })); // reported
```

Removed reports: none.

Silencing: turn decorator metadata on in the tool that runs the code, give each
validated parameter its own `new ValidationPipe({ expectedType: Dto })`, or a
new boolean option `assumeDecoratorMetadata` for builds the scan cannot read. An
`expectedType` on the global pipe is not a fix: NestJS uses it as the metatype
of every parameter, so every other DTO's constraints go unchecked or valid
requests are rejected; it does not silence the report.

Fidelity model: `no_missing_validation_pipe.qnt` gains a `Metadata` dimension
(`On | Off | Extends | Unreadable`) crossed with the global-pipe registration.

## Verification

`npx vitest run --config vitest.config.mts src/utils/project-context.test.ts src/rules/no-missing-validation-pipe`
in the plugin; then fidelity, mutation and the corpus scan as in the intent.

## Rejected alternatives

- **Report every handler.** The fix is one build setting; hundreds of reports
  for it teach the reader to disable the rule.
- **Follow `extends` into `node_modules`.** Unbounded reads for a flag most
  projects set locally; `unknown` is the honest answer there.
- **Leave it to NestJS's own warning.** It exists only from 12.5.0 and 11.2.10,
  is a log line at startup, and the peer range still admits NestJS 9.

## Out of scope

`import type { Dto }` on a validated parameter, which erases the metatype for
one parameter on any build: a different defect with a per-parameter fix.
Constructor injection without metadata.
