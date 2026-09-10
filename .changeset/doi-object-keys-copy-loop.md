---
'eslint-plugin-secure-coding': minor
---

fix(secure-coding): `detect-object-injection` sees a copy loop keyed by `Object.keys`

`for (const k of Object.keys(src)) target[k] = src[k]` was silent while the
`for..in` spelling of the same loop reported. The two detectors were armed on
different predicates — the `for..in` one on a parameter **or** a request-rooted
source, this one on request-rooted only — so a library's `merge(target, src)`,
where the attacker's object arrives as a parameter, went unreported in the
spelling modern TypeScript actually uses.

The exemption's justification is read-shaped: keys off these loops are real
property names _on the source_. That says nothing about a write into a
different object. `JSON.parse('{"__proto__":…}')` defines `__proto__` as an own
enumerable property, so `Object.keys` returns it and `target[k] = …` is a
`[[Set]]` that walks to the setter — the lodash.merge / deep-extend CVE class
this detector exists for.

**This rule now reports where it did not before.** Naming `__proto__` in the
loop still clears the finding, the same remediation guard the `for..in` twin
honours — but that guard is read from TOKENS, not source text. Reading the text
meant a `/* __proto__ */` COMMENT anywhere in the loop cleared the report: an
undeclared suppression comment in the rule whose subject is prototype
pollution.
