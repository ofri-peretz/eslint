---
'eslint-plugin-node-security': patch
---

fix: no-zip-slip no longer reports node-tar extract or a path used as text

`no-zip-slip` no longer reports `tar.extract` from node-tar called with an options literal that leaves `preservePaths` off, or a joined path that only becomes error or console text. `preservePaths: true`, options held in a variable, and a path that also opens a file keep reporting (Budibase, oracle).
