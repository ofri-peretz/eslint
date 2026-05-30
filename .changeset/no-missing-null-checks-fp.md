---
"eslint-plugin-reliability": patch
"eslint-plugin-express-security": patch
"eslint-plugin-jwt": patch
"eslint-plugin-lambda-security": patch
"eslint-plugin-mongodb-security": patch
"eslint-plugin-nestjs-security": patch
"eslint-plugin-pg": patch
"eslint-plugin-vercel-ai-security": patch
---

fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

Rules that were recognized as null guards are now correctly identified as safe:

1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.
