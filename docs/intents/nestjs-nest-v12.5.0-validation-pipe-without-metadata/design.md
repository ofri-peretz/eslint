# Design — a ValidationPipe with no parameter types validates nothing

Intent: [`intent.md`](./intent.md). **Status:** draft.

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
reads the `tsconfig.json` beside `package.json` (and `tsconfig.build.json` when
present) and sets `emitsDecoratorMetadata`. `no` only when the file is readable,
has no `extends`, and sets the flag to `false` or leaves it out; anything else
is `unknown`.

New report, in `no-missing-validation-pipe`: `validationPipeWithoutMetadata`, on
`app.useGlobalPipes(new ValidationPipe())` in the bootstrap file, or on the
`APP_PIPE` provider. One report per registration, not per handler.

```ts
// tsconfig.json: { "compilerOptions": { "experimentalDecorators": true } }
app.useGlobalPipes(new ValidationPipe({ whitelist: true })); // reported
```

Removed reports: none.

Silencing: turn `emitDecoratorMetadata` on, give the pipe an `expectedType`, or
a new boolean option `assumeDecoratorMetadata` for builds the scan cannot read.

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
