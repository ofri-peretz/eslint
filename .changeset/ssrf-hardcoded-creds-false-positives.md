---
'eslint-plugin-node-security': patch
'eslint-plugin-secure-coding': patch
---

Cut two false positives confirmed against the benchmark corpus SAFE fixtures.

**`node-security/no-ssrf`** — the user-input gate only ran when the URL argument
was a bare identifier, so every other shape reported unconditionally. A Node
options object built from a helper's own parameters —
`https.request({ host, path, method: 'GET' })`, from
`benchmarks/corpus/CWE-444/safe/request-default-parser.js` — was flagged with no
user data anywhere in the flow.

The gate now applies to every argument shape and requires evidence: a
user-input-named identifier standing as the URL, a read off a request object
(`req` / `request` / `ctx` / `event`), or a template literal or concatenation
interpolating either. Options-object fields count when they are request-sourced,
or when a `url` / `href` / `uri` key holds a user-input-named identifier.

Newly ignored: options objects and interpolations built purely from locals.
Still reported: `fetch(userUrl)`, `fetch(req.query.url)`,
`https.request({ host: req.query.host })`, `` fetch(`https://${userHost}/x`) ``.

**`secure-coding/no-hardcoded-credentials`** — `secret: '<your-secret-here>'`
from `benchmarks/corpus/CWE-798/safe/test-placeholder-values.js` was reported at
CVSS 9.8. The angle brackets are two character classes, which is all the shape
gate asks for once the slot is credential-named.

Self-evident placeholders are now skipped: bracketed template slots (`<…>`,
`{{…}}`, `${…}`, `[…]`), placeholder words standing as their own token
(`changeme`, `YOUR_API_KEY`, `example`), and one character repeated
(`xxxxxxxxxxxx`). Whole-token matching only, so a real secret that merely
contains such a substring is unaffected.

The allowlist applies to non-structural findings only — a JWT, an `sk_live_`
key, or a `postgres://user:pass@host` string still reports whatever words it
contains. Set the new `allowPlaceholders: false` option to restore the previous
behaviour.
