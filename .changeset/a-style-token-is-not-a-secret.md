---
'eslint-plugin-secure-coding': patch
---

fix: `no-hardcoded-credentials` no longer reports CSS as a credential

`pass: "text-[var(--success)]"` — a Tailwind class map — reported at CWE-798 / CVSS 9.8. The key is credential-shaped, and the value cleared the shape guards, so the name promoted it.

A secret is written to be unreadable; `var(--x)`, a custom-property name, and a Tailwind arbitrary value are all written to be read. `isStyleToken` recognises those three shapes and returns before the entropy test. A bare `#0a0a0a` with no CSS context around it still reports — that shape is a short key.
