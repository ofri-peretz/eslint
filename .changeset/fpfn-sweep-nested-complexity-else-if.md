---
'eslint-plugin-maintainability': patch
---

fix: `nested-complexity-hotspots` no longer counts `else if` as a nesting level

ESTree models `else if` as an `IfStatement` in the parent's `alternate`, and the depth walk
counted each link, so a flat chain climbed one level per branch: code sitting at indentation
level 2 reported "Nesting depth 6 exceeds maximum 4". The rule was flagging the exact shape
its own fix text — "use early returns, guard clauses" — tells you to write.

ESLint core's `max-depth` excludes `else if` for the same reason, and the sibling rule
`cognitive-complexity` already carries `// else if doesn't increase nesting`. Genuine
nesting inside an `else if` branch still accumulates and still reports.
