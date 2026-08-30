---
'eslint-plugin-secure-coding': minor
---

**✨ Feature** — the names these rules look for are yours to state

`no-hardcoded-credentials` and `no-unlimited-resource-allocation` carried
hardcoded English identifiers and treated them as fact: a variable had to be
called `secret` to be a credential, `limit` to be a bound. A project that names
its bindings in another language, or behind a domain vocabulary, was
unreachable — and the list was written down nowhere a consumer could read it.

New options, each REPLACING the default rather than extending it, so a consumer
who states their vocabulary is not still measured against ours:

| Rule                               | Option                               |
| ---------------------------------- | ------------------------------------ |
| `no-hardcoded-credentials`         | `credentialWords`                    |
| `no-unlimited-resource-allocation` | `sizeProperties`, `limitOptionNames` |

```json
"secure-coding/no-hardcoded-credentials": ["error", { "credentialWords": ["sigilo", "chave"] }]
```

Defaults are unchanged, so nothing moves unless you set the option.

What is NOT configurable, deliberately: a vendor's key FORMAT. `sk_live_…`,
`ghp_…`, `AKIA…` are somebody else's published contract, not our guess at
yours, so the rule still reports those on value alone — even when you have
replaced the name vocabulary entirely.
