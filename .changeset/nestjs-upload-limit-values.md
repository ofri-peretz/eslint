---
'eslint-plugin-nestjs-security': minor
---

feat: `require-upload-size-limit` reads `Infinity`, `undefined` and `null` as no limit

Follows NestJS 12.5.0 and 11.2.10, which leave a nil route option out of the merge and name `Infinity` as the way to lift a limit.

- **Newly reported:** `FileInterceptor('file', { limits: { fileSize: Infinity } })`, under the new message `unlimitedFileSize`, whatever `MulterModule.register()` sets: a route's `Infinity` replaces the module's limit.
- **Newly reported:** `fileSize: undefined`, `fileSize: null`, `limits: undefined`, `limits: null` and `undefined` in place of the options, when no module sets a limit. NestJS leaves these out of the merge, so they set nothing.
- **No longer a limit:** `MulterModule.register({ limits: { fileSize: Infinity } })` (or `undefined` / `null`) does not silence the project's interceptors.
- **To silence:** set a finite `fileSize`, or `// eslint-disable-next-line nestjs-security/require-upload-size-limit` on a route that is unbounded on purpose. No option was added.
