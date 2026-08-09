---
"eslint-plugin-secure-coding": patch
---

`no-improper-sanitization` no longer reports developer-authored output or code
that already escapes.

This rule produced 42 of the 411 findings on the 13-repo wild corpus — its
largest single contributor — and one of the 16 ILB-CWE-Corpus false positives.

**Removed the custom-sanitizer check** (8 wild findings, 1 corpus). It reported
any call to a function whose *name* contained sanitize/escape/clean when an
argument's printed text contained `req.`/`body`/`query`/`params`/`input`/`data`
— so `sanitizeForLog(req.body.username)` was a finding. That is the correct
code, and the claim "custom sanitizer may be incomplete or bypassable" was made
about an implementation the check never read. The `dangerousSanitizerUsage`
messageId is gone with it.

**Widened the authored-text exemption** (34 wild findings). A literal reaching
`res.send`/`write`/`json` is exempt when no tainted leaf reaches the sink with
it, rather than only when it is the direct argument. Now covered: concatenated
literals, `['<li>', '</li>'].join('\n')`, values passed through a named
sanitizer (`escapeHtml`, `DOMPurify.sanitize`, `he.encode`), and object
literals served as JSON.

The #441 false negatives stay closed — `res.send(req.query.name || '<p>x</p>')`,
the ternary form, and any tainted operand still report, as do computed callees,
deeper member chains, and template literals carrying expressions.
