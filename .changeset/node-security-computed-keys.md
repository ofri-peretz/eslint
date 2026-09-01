---
'eslint-plugin-node-security': minor
---

fix: five rules now see `o['k']` as the same access as `o.k`

- `detect-child-process` — `cp['spawn']('bash', ['-c', cmd])`
- `detect-non-literal-fs-filename` — `fs['readFileSync'](req.query.p)`
- `no-arbitrary-file-access` — `fs['readFileSync']`, `path['join']`
- `require-secure-credential-storage` — `AsyncStorage['setItem']('apiKey', key)`,
  `Object['assign'](process.env, { … })`
- `require-storage-encryption` — `fs['writeFile']('creds.json', password)`

The credential fixes live in `credential-evidence.ts`, which both storage rules
read, so one change closed both.

Command injection is not less injectable for being minified, and a credential
written to disk unencrypted is unencrypted either way.
