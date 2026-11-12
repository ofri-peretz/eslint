---
'eslint-plugin-nestjs-security': patch
---

fix: install alongside NestJS 12

The `@nestjs/common` peer range stopped at `^11.0.0`, so `npm install eslint-plugin-nestjs-security` in a NestJS 12 project failed with `ERESOLVE`. The range now admits `^12.0.0`. No rule changes in this entry.
