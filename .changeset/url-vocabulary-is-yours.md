---
'eslint-plugin-browser-security': minor
---

**✨ Feature** — `no-incomplete-url-sanitization` gains `urlNameWords`

The rule decided a value was a URL partly from its NAME, against a fixed
English regex: `url|uri|href|host|origin|domain|referrer|endpoint|link`. That
list is one of two independent kinds of evidence — the other is taint — so it
widens recall rather than deciding alone, which is exactly why it needed to be
replaceable. A codebase whose URL variable is `endereco` got nothing from it
and had no way to ask; a `linkedList` was caught by `link`.

`urlNameWords` REPLACES the default:

```json
"browser-security/no-incomplete-url-sanitization": [
  "error",
  { "urlNameWords": ["url", "endereco", "enlace"] }
]
```

Default is unchanged, so nothing moves unless you set it.

What stays hardcoded, and now says why: the passthrough methods are
`String.prototype` (ECMAScript) and the host labels are IANA TLDs. Those are
published names, not our guess at yours.
