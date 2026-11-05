---
'eslint-plugin-import-next': patch
---

fix(import-next): `no-empty-named-blocks` autofix no longer deletes `import {} from 'm'` / `export {} from 'm'`, which silently dropped the module's side effects. It rewrites them to `import 'm'` (import attributes kept); type-only statements are still removed, and removing a value statement entirely remains a suggestion.
