---
'@interlace/eslint-devkit': patch
---

fix: value-follow reads export ownership the way ES modules do

`exportedValue` now stops at an explicit export with no initialiser (`export let token;`) instead of falling through to a star re-export of another `token`; resolves `export * as ns from './x'` to that module's namespace; and returns nothing for a name two `export *` statements carry to different values, which ES modules treat as not exported.
