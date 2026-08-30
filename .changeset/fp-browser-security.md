---
'eslint-plugin-browser-security': patch
---

**🐛 Fix** — `no-innerhtml` missed three receiver shapes

Found by running the rule against code written specifically to break it, and
pinned by a case that fails on the unfixed rule.

`ChainExpression`, `LogicalExpression` and `ConditionalExpression` receivers
went unreported, so `el?.innerHTML = x` and `(a || b).innerHTML = x` were
silently allowed.

One finding from the same pass turned out to be the rule being RIGHT:
`DOMPurify?.sanitize(h) ?? h` really does hand the raw payload to `innerHTML`
when the module is absent. That is recorded as a decoy, not fixed.
