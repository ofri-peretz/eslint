---
'eslint-plugin-nestjs-security': patch
'@interlace/eslint-devkit': patch
---

fix: no-missing-validation-pipe accepts a project decorator that wraps ValidationPipe

A helper such as `export function UseValidationPipe(o) { return UsePipes(new ValidationPipe(o)); }` is now followed to its definition, in the same file or across relative imports and `export *` barrels, and counts as the pipe when every path out of it installs `ValidationPipe` (directly or through `applyDecorators`). Ever Gauzy applies its pipe this way, and the rule reported 1,386 of its route parameters as unvalidated. On its core and auth packages the count drops from 827 to 278, the handlers that carry no pipe at all. The devkit's cross-file `exportedValue` now reads `export *` re-exports, and the walk is exported as `valueFollow`.
