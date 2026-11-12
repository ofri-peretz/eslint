---
title: require-upload-size-limit
description: Flags a multer upload interceptor that sets no limits.fileSize, so the route accepts a file of any size.
tags: ['security', 'nestjs']
category: security
severity: medium
cwe: CWE-770
owasp: 'A04:2021'
autofix: false
---

> Requires a limits.fileSize on multer upload interceptors

<!-- @rule-summary -->

Flags `FileInterceptor`, `FilesInterceptor`, `FileFieldsInterceptor` and
`AnyFilesInterceptor` from `@nestjs/platform-express` when their options set no
`limits.fileSize`.

<!-- @/rule-summary -->

## Rule Details

multer only enforces a limit that is present in `limits`, and `fileSize`
defaults to `Infinity`. NestJS fills in defaults for two field-_name_ limits
(`applyDefaultLimits`, `platform-express/multer/multer.utils.ts`, v12.4.1) and
nothing for the size of a file. So this route stores however many bytes the
client sends, in memory, because memory is the default storage:

```ts
@Post('avatar')
@UseInterceptors(FileInterceptor('file'))
upload(@UploadedFile() file: Express.Multer.File) {}
```

Measured across 79 NestJS repositories: 77 upload interceptors in 21 of them,
and 34 of the 49 files that call one name no size limit anywhere in the file.
The rule reports 40 of those calls in 11 repositories. Read one by one: 38 are
uploads with no bound in the project, 2 are an admin database-restore route that
is unbounded on purpose, and none is something other than an upload.

Rated medium rather than high because of who can reach it: all but a handful of
the 38 sit behind authentication, so the client that can fill the disk or the
heap is a signed-in one.

### `MaxFileSizeValidator` is not a limit

```ts
@UploadedFile(
  new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 1e6 })] }),
)
```

A pipe runs after the interceptor, and the interceptor is what reads the request
body. By the time the validator rejects a 4 GB upload, multer has received and
stored all 4 GB. The validator checks the result; it does not bound the upload.
Keep it for the error message, and set `limits.fileSize` for the bound.

## ❌ Incorrect

```ts
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@UseInterceptors(FileInterceptor('file'))
@UseInterceptors(FileInterceptor('file', { dest: './uploads' }))
@UseInterceptors(FileInterceptor('file', { limits: { files: 1 } }))
// The second argument is maxCount: it caps how many files, not how large.
@UseInterceptors(FilesInterceptor('files', 10))
```

## ✅ Correct

```ts
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
@UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 5 * 1024 * 1024 } }))

// A const of the same file is read.
const uploadOptions = { limits: { fileSize: 5 * 1024 * 1024 } };
@UseInterceptors(FileInterceptor('file', uploadOptions))
```

Or once per module — the options are merged under every interceptor of that
module's controllers:

```ts
@Module({
  imports: [MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } })],
})
export class FilesModule {}
```

## Cross-File Detection

`MulterModule.register()` lives in a module file, not next to the route. The
rule scans the project's `*.module.ts` files once and stays quiet when any
registration sets `limits.fileSize`, or uses `registerAsync` with a
`useClass`/`useExisting` whose options it cannot read.

## What this rule deliberately does not report

- **Options it cannot read**: an imported constant, a function call, an object
  with a spread. The limit may be there.
- **`NoFilesInterceptor`**: it rejects every file.
- **Interceptors from other packages**. Only bindings imported from
  `@nestjs/platform-express` are checked; a Fastify multipart adapter has its
  own option shape.

## Options

| Option         | Type      | Default | Description                                     |
| -------------- | --------- | ------- | ----------------------------------------------- |
| `allowInTests` | `boolean` | `true`  | Skip this rule in `*.test.*` / `*.spec.*` files |

## Known False Negatives

- The module scan is per project, not per module. In a project where one module
  sets `limits.fileSize` and another registers nothing, the second module's
  interceptors are not reported.
- `fileSize: Infinity`, or a value read from configuration that turns out to be
  unset, counts as a limit.

## When Not To Use It

When upload size is bounded before the request reaches Node — a reverse proxy
with `client_max_body_size`, an API gateway payload cap — and you rely on that
alone.

## Further Reading

- [CWE-770: Allocation of Resources Without Limits or Throttling](https://cwe.mitre.org/data/definitions/770.html)
- [multer `limits`](https://github.com/expressjs/multer#limits)
- [NestJS file upload](https://docs.nestjs.com/techniques/file-upload)
