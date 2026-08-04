---
'eslint-plugin-secure-coding': patch
---

Stop `no-insecure-comparison` mangling `== null` under `--fix`

The rule offered the `==` → `===` rewrite as an auto-applied `fix`, so
`eslint --fix` rewrote this:

```js
if (body == null) return 0;   // matches null AND undefined
```

into this:

```js
if (body === null) return 0;  // no longer matches undefined
```

`undefined == null` is `true`; `undefined === null` is `false`. The fix
changed runtime behaviour and introduced bugs in consumer code. It is now a
suggestion rather than an auto-applied fix — the rewrite is not guaranteed to
preserve behaviour when the operands differ in type, not only for null.

Separately, `x == null` / `x != null` is no longer reported at all. It is the
idiomatic nullish check, deliberately matching both null and undefined, which
is why core `eqeqeq` exempts it under `smart` / `allow-null`. Reporting it as
CWE-697 was a false positive — and one carrying CVSS and SOC2/PCI-DSS
metadata.

Measured over `express`, `axios` and `sequelize`: 73 of the rule's 161 reports
were this pattern. After the change the same corpus yields 8 reports, all
genuine type-mismatched loose equality.
