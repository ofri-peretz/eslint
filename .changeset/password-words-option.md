---
'eslint-plugin-secure-coding': minor
---

`detect-weak-password-validation` takes `passwordWords`

The rule decided what counts as a credential from `password|passphrase|passwd|
pwd|pass` — our guess at how a codebase spells it, not a specification. A
project whose field is `secret` or `kennwort` matched none of it, so the rule
silently judged nothing. `passwordWords` replaces the list.

The eight-character floor stays fixed and now cites NIST SP 800-63B 5.1.1.2,
because that one is a published requirement rather than a preference.

It also compared `node.property.name` directly, so `body['password'].length < 6`
reached the same property by a spelling the rule could not see. It now resolves
the property through `propertyName`.
