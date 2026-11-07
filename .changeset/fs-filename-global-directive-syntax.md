---
'eslint-plugin-node-security': patch
---

fix: `detect-non-literal-fs-filename` reads `/* global */` directives the way ESLint does

Names may be separated by whitespace as well as commas, a `-- justification` is ignored, `: off` removes a global, and a later directive overrides an earlier one.
