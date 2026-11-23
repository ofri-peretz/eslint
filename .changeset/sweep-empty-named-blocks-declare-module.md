---
'eslint-plugin-import-next': patch
---

fix(import-next): no-empty-named-blocks no longer autofixes a load-bearing import

An empty `import type {}` beside a same-file `declare module` is what
binds that block as an augmentation rather than a fresh ambient module.
Still reported, and still offered as a suggestion, but no longer
autofixed when a `declare module` for the same specifier exists.
