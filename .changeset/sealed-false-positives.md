---
'eslint-plugin-browser-security': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-reliability': patch
'eslint-plugin-secure-coding': patch
---

**🐛 Fix** — false positives found by adversarial review, each sealed by a test

Every fix here came from running the rule against code written specifically to
break it, and each one is now pinned by a case in the ledger that fails on the
unfixed rule.

- `browser-security/no-innerhtml` — missed `ChainExpression`,
  `LogicalExpression` and `ConditionalExpression` receivers, so
  `el?.innerHTML = x` and `(a || b).innerHTML = x` went unreported.
- `secure-coding/no-unsafe-regex-construction` — reported when only the FLAGS
  were dynamic and the pattern was a literal, which cannot introduce a
  catastrophic backtrack on its own.
- `reliability/no-unhandled-promise` and `maintainability/no-unhandled-promise`
  — the nested-argument skip was deciding on the inner call rather than the
  outer one, silencing a genuinely unhandled promise passed as an argument.
- `secure-coding/no-zip-slip` (moved to `node-security`) — a handler keyed on a
  variable being named `entry` had an empty body, so it matched and then did
  nothing; deleted rather than filled in.

Three findings from the same pass turned out to be the rule being RIGHT and
the reviewer being wrong — `execFile('ls', [userInput])` really is CWE-88, a
`role="navigation"` on `<nav>` really is a deliberate default exception, and
`DOMPurify?.sanitize(h) ?? h` really does hand the raw payload to `innerHTML`
when the module is absent. Those are recorded as decoys, not fixed.
