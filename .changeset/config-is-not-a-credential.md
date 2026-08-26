---
'eslint-plugin-node-security': patch
---

**🐛 Fix** — `require-secure-credential-storage` no longer reads configuration as a credential

`namesACredential` matched by substring, so `process.env.TOKEN_SIGNING_ALG = 'RS256'`
reported storing a token in the environment. It names an algorithm.

Clustering 26,434 findings from 158 repositories made this the largest single
false-positive shape the rule produces: **110 instances of that one line**.

A name whose last word is configuration — `alg`, `expiry`, `ttl`, `type`, `name`,
`header`, `issuer`, `url` and similar — describes a credential rather than holding
one. Only the final segment is tested, so `API_TOKEN`, `CLIENT_SECRET` and
`DB_PASSWORD` still match on their own tails and nothing is narrowed for a real
secret.
