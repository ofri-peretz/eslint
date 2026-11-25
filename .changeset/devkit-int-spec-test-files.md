---
'@interlace/eslint-devkit': patch
---

fix: isTestFilePath recognises `.<kind>-spec` and `.<kind>-test` file names

`e2e-spec` was the only infixed name. nestjs/observe names its integration suite `*.int-spec.ts`, and `nestjs-security/require-guards` reported 189 times on the test controllers there. Any `.<word>-spec.` or `.<word>-test.` (hyphen or underscore) now counts; `src/int-spec.ts` and `src/inspect.ts` stay source.
