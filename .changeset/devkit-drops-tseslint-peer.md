---
'@interlace/eslint-devkit': minor
---

feat: `@typescript-eslint/utils` is no longer a peer dependency

Devkit's published types now come from its own vendored declarations, so nothing in the package (runtime or types) needs `@typescript-eslint/utils` installed. Plugins built on devkit stay assignable to typescript-eslint's `FlatConfig.Plugin`, and a test checks that for every plugin.
