# Design — Infinity, undefined and null are not upload limits

Intent: [`intent.md`](./intent.md). **Status:** draft.

---

## Requirements

- **R1** `limits.fileSize: Infinity` on a platform-express upload interceptor is
  reported as `unlimitedFileSize`, whatever the project's `MulterModule` sets.
- **R2** `fileSize`, `limits` or the options argument spelled `undefined` or
  `null` is read as not set: reported as `missingFileSizeLimit` unless a module
  sets the limit.
- **R3** `MulterModule.register()` whose `fileSize` is `Infinity`, `undefined` or
  `null` is not a module limit.
- **R4** Any other `fileSize` value, readable or not, is a limit, as before.
- **R5** Each message's fix text closes the hole for its shape.

## Design

`packages/eslint-plugin-nestjs-security/src/rules/require-upload-size-limit/index.ts`:
`setsFileSize(): boolean | null` becomes `fileSize(): 'set' | 'unset' |
'infinite' | 'unknown'`. `isNil()` recognises the identifier `undefined` and the
literal `null`, the two values NestJS's `withoutNil` drops. The visitor reports
`infinite` at once, and `unset` after the module check.

`packages/eslint-plugin-nestjs-security/src/utils/project-context.ts`:
the `fileSize` key test in `registersUploadLimit()` gains a negative lookahead
for the three spellings.

Reports added:

- `unlimitedFileSize` — `FileInterceptor('file', { limits: { fileSize: Infinity } })`.
  Fix text: replace `Infinity` with the largest size the route should accept.
- `missingFileSizeLimit` — `FileInterceptor('file', { limits: { fileSize: undefined } })`,
  `{ limits: null }`, `FileInterceptor('file', undefined)`.
- `missingFileSizeLimit` — `FileInterceptor('file')` in a project whose only
  registration is `MulterModule.register({ limits: { fileSize: Infinity } })`.

Reports removed: none.

Silencing: a finite `fileSize`, or an inline
`eslint-disable-next-line nestjs-security/require-upload-size-limit` on a route
that is unbounded on purpose. No option is added: the two corpus routes that are
unbounded on purpose are already reported today for setting no limit, and an
option would be a project-wide switch for a per-route decision.

Fidelity model (`benchmarks/suites/fidelity/models/nestjs-security/require_upload_size_limit.*`):
`Opts` gains `InfiniteFileSize | NilFileSize | NilLimits | NilOptions`;
`Project` gains `ModuleInfinite`; `InfiniteFileSize` and `NilFileSize` join the
shapes crossed with every spelling, project and validator. Domain 216 x 3.

Tests: `require-upload-size-limit.test.ts` (seven invalid, three valid, two
module-interaction cases) and `project-context.test.ts` (nine spellings that are
not a limit, two look-alike names that are).

## Verification

`npx vitest run --config vitest.config.mts` in the plugin exits non-zero when
any of R1-R4 breaks; the new cases failed on `origin/main` before the change.
`npm run fidelity -- nestjs-security/require_upload_size_limit`, proven live by
removing the `InfiniteFileSize` clause from the model and watching it diverge.

## Rejected alternatives

- **Treat a literal `undefined` as lifting the module's limit**, which is what
  NestJS did before 12.5.0 / 11.2.10. It would report a route that the patched
  versions bound; the patch exists on both supported lines, so the rule reads
  it. The doc says so.
- **An `allowUnlimited` option.** See Silencing.
- **Resolve `Number.POSITIVE_INFINITY`, `1 / 0` and constants.** No corpus file
  spells an unlimited size at all; `Infinity` is the spelling NestJS documents.
  Listed as a known false negative.
- **Read the installed NestJS version to pick the `undefined` semantics.** A
  manifest read on every project for a literal nobody in 79 repositories writes.

## Out of scope

`@nestjs/platform-node` and `@nestjs/platform-fastify` upload interceptors. The
other limits (`files`, `parts`, `fieldSize`).
