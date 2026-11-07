---
'eslint-plugin-node-security': patch
---

fix: `detect-non-literal-fs-filename` honours `/* global NAME */` declarations under oxlint too. A path built from a declared global (configuration the environment provides) was silent under ESLint and reported under oxlint, whose scope manager does not read the comment.
