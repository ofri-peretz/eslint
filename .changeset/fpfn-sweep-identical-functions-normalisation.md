---
'eslint-plugin-maintainability': patch
---

fix: `identical-functions` normalisation no longer erases or skips distinguishing text

Nested literal placeholders are restored until none remain: a backticked word
inside a quoted string was stashed twice and never expanded, so bodies
differing only there compared identical. The object-key guard no longer
swallows ternary consequents or TypeScript type annotations, which had stopped
every annotated declaration from having its bindings renamed.
