---
'eslint-plugin-browser-security': minor
---

**✨ Feature** — `no-sensitive-indexeddb` gains `sensitiveTerms`

`additionalPatterns` could only GROW the sensitive-term list. That is the wrong
shape for a guess: you could add forever and never stop the report on a word we
picked wrongly. If your `token` is a lexer token, or your `secret` is a game
mechanic, adding terms does not help — you need to remove ours.

`sensitiveTerms` REPLACES the default vocabulary:

```json
"browser-security/no-sensitive-indexeddb": [
  "error",
  { "sensitiveTerms": ["contrasena", "clave", "sesion"] }
]
```

`additionalPatterns` still works and is unchanged; the two answer different
questions — "we also call it X" and "we do not call it Y".

Not replaceable, deliberately: the bearer-credential half matches the HTTP
Authorization scheme and the JWT shape (RFC 6750, RFC 7519). Those are
published formats, so `accessTokens` is still reported with the vocabulary
emptied.
