---
'eslint-plugin-browser-security': patch
---

fix: `no-clickjacking` — a declared frame protection must actually protect.

fix: `no-clickjacking` — a declared frame protection no longer counts unless it
actually protects. The predicate matched the `X-Frame-Options` header NAME and
discarded its value, so the rule's own documented "Incorrect" example —
`ALLOWALL` — suppressed the report for the entire file; separately, a bare
`deny` or `sameorigin` string anywhere in the file did the same, with no header
context. The value now decides, and a bare word counts only where the AST shows
it is the header's value (header map, Next.js `headers()` pair, or
`setHeader(name, value)`). All five previously locked `valid` cases are
unchanged.
