---
'eslint-plugin-jwt-security': patch
---

fix: `require-expiration` reads a `JwtModule` registered in `main.ts` / `bootstrap.ts`

NestJS 12.5.1 accepts module metadata as the root module: `NestFactory.create({ imports: [JwtModule.register({ secret })] })` registers `JwtModule` without any `*.module.ts`. The rule only read `*.module.ts` files, so it could not see that registration.

- **Newly reported:** `this.jwtService.sign(payload)` when the package's `JwtModule.register(...)` in `main.ts` or `bootstrap.ts` sets no `signOptions.expiresIn`.
- **No longer reported:** a service-call report can disappear when the newly read registration is opaque. If `auth.module.ts` registers `JwtModule` without expiration and `main.ts` adds `JwtModule.register(loadOptions())`, the combined verdict is unknown and `this.jwtService.sign(payload)` is no longer reported.
- **Also changed:** `jwt.sign(payload)` on a `const jwt = new JwtService(...)` no longer defers to the module registration (a constructed service never receives it) and is reported unless its own `signOptions` set `expiresIn`. The suggestion for options held in a variable now merges `{ ...opts, expiresIn: '1h' }` in place, and inserts the options before a callback, instead of appending a fourth argument.
- **To silence:** set `signOptions: { expiresIn: '15m' }` in that registration, or pass `{ expiresIn }` on the call. No option was added.
