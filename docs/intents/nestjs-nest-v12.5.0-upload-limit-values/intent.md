---
slug: nestjs-nest-v12.5.0-upload-limit-values
opened: 2026-11-13
packages:
  - eslint-plugin-nestjs-security
cases: []
---

# Intent — Infinity, undefined and null are not upload limits

> Stage 1 artifact. Opened by the NestJS release watch on reading nest v12.5.0
> and v11.2.10.

**Status:** draft · **Opened:** 2026-11-13 · **Owner:** @ofri-peretz

---

## What is wanted

`require-upload-size-limit` stays quiet only for a `limits.fileSize` that bounds
the upload. `Infinity` is reported as lifting the limit; `undefined` and `null`
are read as not set.

## Why now

[nest v12.5.0](https://github.com/nestjs/nest/releases/tag/v12.5.0) and
[v11.2.10](https://github.com/nestjs/nest/releases/tag/v11.2.10) change how a
route's upload options are merged with the module's
([7bc8d9121e](https://github.com/nestjs/nest/commit/7bc8d9121e2bb4392cb235aaa85fecab07a990db)),
and name `Infinity` as the way to lift a limit. Read at the v12.5.0 tag,
`packages/platform-express/multer/multer/multer.utils.ts`:

- lines 58-75, `mergeMulterOptions`: the route's options and its `limits` go
  through `withoutNil` before they are spread over the module's.
- lines 77-81, `withoutNil`: drops every entry whose value is `null` or
  `undefined`.
- lines 92-160, `applyDefaultLimits`: defaults the field-name limits and, new in
  this release, `parts` (1000). Still nothing for `fileSize`.
- the commit's own test: `mergeMulterOptions({ limits: { fileSize: 1024 } },
{ limits: { fileSize: Infinity } })` gives `{ fileSize: Infinity }`.

The rule asked only whether the key `fileSize` was present. Seven fixtures, run
against the rule on `origin/main`, each expected to report and each silent:

```ts
FileInterceptor('file', { limits: { fileSize: Infinity } });
FilesInterceptor('files', 10, { limits }); // const limits = { fileSize: Infinity as number }
FileInterceptor('file', { limits: { fileSize: undefined } });
FileInterceptor('file', { limits: { fileSize: null } });
FileInterceptor('file', { limits: undefined });
FileInterceptor('file', { limits: null });
FileInterceptor('file', undefined);
```

`vitest` before the change: 7 failed in the ESLint run and the same 7 in the
Oxlint run, plus the module-scan case
(`MulterModule.register({ limits: { fileSize: Infinity } })` counted as a
limit).

Real code, 79 NestJS repositories (`tmp/nest-corpus*`, 19,244 files), every
rule of the plugin before and after:

|                                    | findings |
| :--------------------------------- | -------: |
| before, all rules                  |    2,361 |
| after, all rules                   |    2,361 |
| added                              |        0 |
| removed                            |        0 |
| `require-upload-size-limit` before |       40 |
| `require-upload-size-limit` after  |       40 |

Nobody in the corpus writes these values yet. The change is for the code the
release note now tells people to write.

## Affected users and systems

Users of `require-upload-size-limit` in `eslint-plugin-nestjs-security` and its
Oxlint twin. The rule doc and its generated page. The rule's fidelity model. The
project scan in `src/utils/project-context.ts`.

## Constraints

- No new dependency; type-unaware.
- Decided from the value's syntax, not from a name.
- A `fileSize` the file cannot evaluate (`config.maxSize`, a call, a constant)
  stays a limit: saying it is not would be a guess.
- No existing report is lost.

## Success criteria

- `npx vitest run --config vitest.config.mts` in the plugin: green, 100%.
- `npm run fidelity -- nestjs-security/require_upload_size_limit`: 0 failing,
  648 of 648 inputs.
- `npm run mutation -- --plugin nestjs-security --rules require-upload-size-limit`:
  no survivor.
- Corpus scan: nothing added that is not an unbounded upload, nothing removed.

## Open questions

None for the rule. One for the repository, found on the way: the banked
mutation score for `nestjs-security/utils/project-context` is 100, and the same
run on untouched `origin/main` gives 96.7 with 12 survivors in the
throttler-guard resolution code. This change adds no survivor there and does
not kill those.
