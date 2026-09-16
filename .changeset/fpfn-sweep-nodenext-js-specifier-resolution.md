---
'@interlace/eslint-devkit': patch
---

fix: resolve NodeNext `.js` specifiers to their TypeScript source

TypeScript's `NodeNext`/`Node16` moduleResolution REQUIRES the output extension
on a relative specifier, so `./b.js` is how a `.ts` file must import its
sibling `b.ts`. The relative fast path only ever APPENDED extensions — probing
`b.js`, `b.js.ts`, `b.js/index.ts`, all misses — and oxc-resolver was
configured without `extensionAlias`, so resolution returned null for the single
specifier form TypeScript ESM mandates.

Rules built on this resolver bail silently on an unresolved import. The
practical effect was that `import-next/no-cycle` — which ships `error` in the
`recommended` and `typescript` presets — could not see a cycle written the only
way TypeScript allows. Deleting four characters from a specifier made the same
cycle report.

On the burgee corpus this surfaces 4 real value-level import cycles that were
previously invisible, and drops `no-unresolved` from 326 findings to 1.

A real `.js` file on disk still wins: the exact-path check runs first.
