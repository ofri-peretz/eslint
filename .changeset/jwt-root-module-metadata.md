---
'eslint-plugin-jwt-security': patch
---

fix: `require-expiration` reads a `JwtModule` registered in `main.ts` / `bootstrap.ts`

NestJS 12.5.1 accepts module metadata as the root module: `NestFactory.create({ imports: [JwtModule.register({ secret })] })` registers `JwtModule` without any `*.module.ts`. The rule only read `*.module.ts` files, so it could not see that registration.

- **Newly reported:** `this.jwtService.sign(payload)` when the package's `JwtModule.register(...)` in `main.ts` or `bootstrap.ts` sets no `signOptions.expiresIn`.
- **No longer reported:** nothing.
- **To silence:** set `signOptions: { expiresIn: '15m' }` in that registration, or pass `{ expiresIn }` on the call. No option was added.
