---
'eslint-plugin-conventions': patch
---

Document that the `guidance` preset requires ESLint 9 or newer (it declares `language: 'markdown/gfm'`, which ESLint 8 rejects). The dist-integrity gate now verifies language presets with their language plugin on a path matching the preset's own `files` under ESLint 9/10, and logs an explicit skip under ESLint 8.
