---
'eslint-plugin-node-security': patch
---

fix: twenty-one Node rules read a member spelled with a string subscript

`cp['spawn']`, `crypto['createCipheriv']`, `fs['writeFileSync']`,
`zip['extractAllTo']`, `b['readUInt8']`, `process['env']` — every one reaches
what its dotted spelling reaches, and twenty-one rules compared
`property.name` before asking what the property was.

Four tests had pinned the miss, and three of them were pinning a false
POSITIVE rather than a gap:

- `crypto['createHmac']('sha1', …)` was reported as a weak hash, while the
  dotted form carries a documented HMAC exemption.
- `process.env['HOME']` was reported as a TOCTOU race, though it names the
  same per-user namespace `process.env.HOME` does — no other user can win it.
- `process["env"].SESSION_TOKEN = t` was NOT reported as a credential in the
  environment, because `env` behind a bracket was called "not provably
  process.env".

The genuinely unknowable form — a name chosen at runtime, `crypto[make](…)` —
is pinned as the refusal in each rule touched.
