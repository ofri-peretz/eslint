---
'eslint-plugin-reliability': patch
'oxlint-plugin-reliability': patch
'eslint-plugin-maintainability': patch
'oxlint-plugin-maintainability': patch
---

fix(reliability): no-silent-errors accepts a two-word reason in an empty catch

With `allowWithComment`, a comment inside an empty catch counted as an explanation only when it matched one of the keywords or ran to three words of prose. `// pre-init — skip` was reported, because the dash is not a word, while a bare `// ignore` passed on the keyword list. Two words that do not open with a placeholder (`todo`, `handle`, `empty`, `nothing`, ...) now count. A single non-keyword word (`// skip`) and a placeholder (`/* handle later */`) still report. The same rule in `eslint-plugin-maintainability` gets the same change. Fixes #1554.
