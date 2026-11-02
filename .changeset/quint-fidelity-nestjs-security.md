---
'eslint-plugin-nestjs-security': patch
---

fix(nestjs-security): renamed imports, spreads and route paths follow the documented contract

Checked against a Quint model of each rule's documented contract (`npm run fidelity`) and by Stryker mutation testing.

- Renamed and namespaced imports (`ValidationPipe`, `SwaggerModule`) are recognised.
- An explicit `false` after an object spread is honoured.
- `require-throttler`'s `skipRoutes` matches route paths, not handler names.
- `no-exposed-private-fields` and `no-unsafe-multer-filename` check TypeORM and multer-only files.

`no-missing-validation-pipe` now reports an unpiped DTO when no global `ValidationPipe` is visible, which is the doc's own ❌ example.
