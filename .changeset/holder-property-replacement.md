---
'eslint-plugin-secure-coding': patch
---

**🐛 Fix** — `detect-object-injection` no longer exempts a holder property that has been replaced. The exemption read the object literal the holder was _created_ with, so `flags.bools = {}` after `const flags = { bools: Object.create(null) }` left an attacker-controlled key landing in a prototype-bearing object with the rule silent — a false negative in the rule whose whole subject is prototype pollution. A write _through_ the property is still exempt; only a replacement of the property, or a rebinding of the holder, withdraws it.
