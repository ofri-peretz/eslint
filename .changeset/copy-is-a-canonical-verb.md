---
'eslint-plugin-conventions': minor
---

feat: `analytics-event-naming` accepts `copy` as an action verb.

Copy-to-clipboard is a canonical dev-content action — code blocks, install
commands — but the fixed verb list rejected it, forcing workaround names
like `article:code_copy_click` for events that are copies, not clicks.
`article:code_copy` is now valid.
