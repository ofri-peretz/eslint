---
'eslint-plugin-secure-coding': patch
---

Stop `no-improper-sanitization` reporting static developer-authored HTML

A bare string literal reaching `res.send()` / `res.write()` / `res.json()` was
reported as CWE-116 whenever it contained `<` or `>`, with no requirement of
interpolation or user input. Express's own `examples/auth/index.js:89` —
`res.send('… <a href="/logout">logout</a>')` — was one of 188 findings the
recommended preset produced on Express's reference code (#398).

The rule already applied the opposite reasoning on the `innerHTML` path
("static developer-authored HTML normally has no taint source"); that
exemption now covers the response-output sinks too. Dangerous markup
(`<script>`, inline `on*=` handlers, `javascript:`) still reports even when
hardcoded, because there the literal is itself the vector.
