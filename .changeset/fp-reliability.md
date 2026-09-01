---
'eslint-plugin-reliability': patch
---

**🐛 Fix** — `no-unhandled-promise` silenced a promise passed as an argument

The nested-argument skip decided on the INNER call rather than the outer one,
so a genuinely unhandled promise handed to another function went unreported.

Pinned by a case that fails on the unfixed rule. The same defect existed in
`eslint-plugin-maintainability`; the two rules share a shape but not a code
path, and two of the branches are dead in one and live in the other — which is
why the fix was made and verified separately in each.
