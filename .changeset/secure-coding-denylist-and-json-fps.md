---
'eslint-plugin-secure-coding': patch
'oxlint-plugin-secure-coding': patch
---

fix(secure-coding): two false positives found dogfooding the protocol-ctf labs

- `detect-object-injection` credits a denylist guard spelled as a membership test: `if (DENY.has(key)) continue;` (or `includes`, or a `return`/`throw` exit), where `DENY` is a `const` array, frozen array or `new Set` that this file spells out and that holds `__proto__`, `constructor` and `prototype`. It counts the same as `key === '__proto__' || …`. The rule reads what the binding holds, not what it is called.
- `no-improper-sanitization` no longer reports a literal that reaches an output call only as a value inside `JSON.stringify(...)`, such as `ws.send(JSON.stringify({ v: hidden ? '<redacted>' : v }))`. A serialised literal with executable markup still reports.
