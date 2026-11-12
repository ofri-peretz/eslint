---
'eslint-plugin-nestjs-security': minor
---

feat: `require-upload-size-limit`, and `require-throttler` now asks for a bound guard

**New rule**

- `require-upload-size-limit` (CWE-770, `warn` in `recommended`) reports `FileInterceptor`, `FilesInterceptor`, `FileFieldsInterceptor` and `AnyFilesInterceptor` from `@nestjs/platform-express` whose options set no `limits.fileSize`. multer has no default for it, so the route stores a file of any size. A limit in a `const` of the same file or in a `MulterModule.register()` of the project counts; a `ParseFilePipe` `MaxFileSizeValidator` does not, because it runs after the upload has been received. Options the file cannot show (an import, a call, a spread) are left alone.

**New reports**

- `require-throttler` no longer takes a `ThrottlerModule.forRoot()` import for app-wide rate limiting. The module only configures limits; nothing is throttled until `ThrottlerGuard` is bound. A project that imports the module and binds the guard nowhere now gets its sensitive routes reported.

- `require-guards`: a globally bound `ThrottlerGuard` subclass named without "Throttler" (`RequestThrottleByUserGuard`) is no longer mistaken for the project's authentication guard, which silenced the rule project-wide.

**Reports removed**

- `require-throttler` reads what a globally bound class extends, through relative imports, `src/…` / `@/…` paths and barrel files, instead of its name. A `ThrottlerGuard` subclass named without "Throttler", or bound as `APP_INTERCEPTOR`, now counts as rate limiting. The name is consulted only when the class cannot be reached (a package or a path alias).

If the new `require-throttler` report is one you do not want, `assumeGlobalThrottler: true` covers it.
