---
'eslint-plugin-node-security': minor
'eslint-plugin-secure-coding': minor
'eslint-plugin-operability': minor
---

**✨ Feature** — the names a rule looks for are now yours to state

Several rules carried a hardcoded list of English identifiers and treated it
as fact: a variable had to be called `entry` to be an archive entry, `secret`
to be a credential, `limit` to be a bound. A project that names its bindings
in Portuguese, or behind a domain vocabulary, was unreachable — and the list
was never written down anywhere a consumer could read it.

New options, each REPLACING the default rather than extending it, so a
consumer who states their vocabulary is not still measured against ours:

| Rule | Option |
|---|---|
| `secure-coding/no-hardcoded-credentials` | `credentialWords` |
| `secure-coding/no-unlimited-resource-allocation` | `sizeProperties`, `limitOptionNames` |
| `node-security/no-zip-slip` | `archiveEntryFields` |
| `operability/require-code-minification` | `minificationKeys` |

```json
"secure-coding/no-hardcoded-credentials": ["error", { "credentialWords": ["sigilo", "chave"] }]
```

Defaults are unchanged, so nothing moves unless you set the option.

What is NOT configurable, deliberately: a vendor's key FORMAT. `sk_live_…`,
`ghp_…`, `AKIA…` are somebody else's published contract, not our guess at
yours, so `no-hardcoded-credentials` still reports those on value alone — even
when you have replaced the name vocabulary entirely.
