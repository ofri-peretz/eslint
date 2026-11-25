# Design — Read a JwtModule registered in root-module metadata

Intent: [`intent.md`](./intent.md). **Status:** shipped.

---

## Requirements

- **R1.** `require-expiration` reads `JwtModule.register` / `registerAsync`
  calls in `main.ts` and `bootstrap.ts` as well as in `*.module.ts`.
- **R2.** A file whose name only ends in those words (`domain.ts`,
  `remain.ts`) is not read.
- **R3.** Nothing else about the verdict changes: one readable registration
  with no `expiresIn` reports; none found, or one that cannot be read, stays
  silent.
- **R4.** nestjs-security's project scan is pinned to read root-module
  metadata in `main.ts`.

## Design

`packages/eslint-plugin-jwt-security/src/utils/nest-modules.ts`: the file
filter `MODULE_FILE` goes from `/\.module\.ts$/` to
`/(?:\.module|[/\\](?:main|bootstrap))\.ts$/`. The walk, the parse, the
`@nestjs/jwt` import check and the verdict are unchanged.

Reports added:

```ts
// src/main.ts
await NestFactory.create({ imports: [JwtModule.register({ secret })] });
// src/auth/auth.service.ts
this.jwtService.sign({ sub }); // missingExpiration
```

Reports removed: none.

To silence: `signOptions: { expiresIn: '15m' }` in the registration, or
`{ expiresIn }` on the call. No option is added.

Quint model `benchmarks/suites/fidelity/models/jwt-security/require_expiration.qnt`
gains the spelling `NestService` with six lifetimes: the registration in a
module file (with and without `expiresIn`), in `main.ts` (with and without),
in `bootstrap.ts` (without), and in a file that is neither (`domain.ts`,
never read). The harness writes them as multi-file inputs with a
`package.json`. Domain 294 to 306.

Mutation testing the rule left 8 survivors from before this change; each is
killed here. Five by a test (a one-argument named `sign()`, a one-argument
`sign` on a constructed `JwtService`, per-call options from a call, a
re-declared payload, options held in a `const` and the suggestion output).
Two were equivalent mutants and the code that no input could tell apart is
gone: a `seconds === null` test that `null <= max` already answered, and a
`definition.type === 'Variable'` test where every other definition kind has no
`init`.

nestjs-security: a test in `src/utils/project-context.test.ts` with `APP_GUARD`
(a `ThrottlerGuard` and an auth guard), `APP_PIPE` and a `MulterModule` limit
inside `NestFactory.create({ ... })` in `main.ts`.

## Verification

- `npx vitest run --config vitest.config.mts` in each of the two plugins.
- `npm run fidelity -- jwt-security/require_expiration`. Taking
  `NestRootMissing` out of `missing()` turns it red (123 divergences).
- `npm run mutation -- --plugin eslint-plugin-jwt-security --rules require-expiration`.
- The nestjs-security lock turns red when `main.ts` and `bootstrap.ts` are
  taken out of `SCANNED_FILE`.
- Corpus: 83 NestJS repositories, rules before and after: 207 findings each,
  0 added, 0 removed.

## Rejected alternatives

- **Read every `.ts` file that mentions `JwtModule`.** Finds a registration in
  any bootstrap file name, but reads far more files on every lint run, for a
  form no repository in the corpus uses yet.
- **Find the `NestFactory.create` call and read only its first argument.**
  More precise, but it misses an `@Module` class declared in `main.ts`, which
  the wider file filter also covers.

## Out of scope

- Bootstrap files with other names.
- Other packages' cross-file NestJS scans: the only other one,
  nestjs-security's project context, already reads `main.ts`.
