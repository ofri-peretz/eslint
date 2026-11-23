---
'eslint-plugin-import-next': patch
---

Fix `no-empty-named-blocks` autofix removing an empty `import type {}` whose presence is what binds a same-file `declare module` as an augmentation rather than a fresh ambient module. Still reported, and still offered as a suggestion, but no longer autofixed in that case.
