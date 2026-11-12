---
'eslint-plugin-nestjs-security': minor
---

feat: NestJS 12 — Standard Schema validation and serialization, returned web responses

**New reports**

- `no-missing-validation-pipe` reports a parameter that declares a `schema` (`@Body({ schema })`, `@Param('id', { schema })`) when no `StandardSchemaValidationPipe` runs on the parameter, the handler, the controller or globally. NestJS 12 only attaches the schema as metadata; that pipe is the one thing that enforces it. New message id: `schemaWithoutPipe`.
- `no-missing-validation-pipe` no longer takes an options object for a pipe: `@Body({ pipes: [] }) dto: CreateDto` is reported, and so is a decorated parameter with a default value (`@Body() dto: CreateDto = {}`), which used to be skipped.
- `no-res-bypass-serialization` treats `StandardSchemaSerializerInterceptor` as a serializer, so a bare `@Res()` under it is reported.
- `no-res-bypass-serialization` reports `return Response.json(value)` from a handler under a serializer: from NestJS 12.4 a returned web `Response` is sent as it is and no serializer touches it. New message id: `webResponseBypassesSerialization`.
- `no-permissive-cors` follows a `const` alias (`const corsOptions = base; app.enableCors(corsOptions)`) and reads through `as` / `satisfies` (`app.enableCors({ origin: '*' } as CorsOptions)`).
- `require-throttler` no longer takes `ThrottlerModule.forRoot()` or `forRoot([])` for app-wide rate limiting: neither declares a throttler.

**Reports removed**

- `no-res-bypass-serialization` and `no-unsafe-multer-filename`: a nested function or `catch` clause that declares the tracked name again through a destructured or default-valued parameter is a different binding, and is no longer read as the injected response / the multer callback.

If a new report is one you do not want, the options that cover it are unchanged: `assumeGlobalPipes`, `assumeGlobalSerializer`, `assumeGlobalThrottler`.
