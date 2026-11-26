---
'eslint-plugin-node-security': patch
---

fix(node-security): `no-arbitrary-file-access` now decides that a path variable is a function parameter by scope resolution, not by matching its name while walking up the tree. A `catch (file)` binding that shadows an outer `file` parameter fed request input is no longer reported as that parameter.
