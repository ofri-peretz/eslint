---
'eslint-plugin-node-security': minor
---

fix(node-security): `no-weak-hash-algorithm` sees `ripemd160`, not just `ripemd`

The pattern was `/\bripemd\b/i`. There is no word boundary between `d` and
`1`, so it could not match `ripemd160` — the canonical spelling, and the one
the rule's own docs use in their ❌ Incorrect block:

```ts
const ripemdHash = crypto.createHash('ripemd160').update(data).digest('hex');
```

`crypto.getHashes()` ships this digest under five names: `ripemd`,
`ripemd160`, `rmd160`, `RSA-RIPEMD160` and `ripemd160WithRSA`. The old pattern
matched the bare alias and the hyphenated `RIPEMD-160`, and missed
`ripemd160`, `rmd160` and `ripemd160WithRSA`. The sole locking test used
`createHash("ripemd")`, which is why the gap survived — that spelling is real,
so this was a coverage hole rather than dead code.

**This rule now reports where it did not before**, at every option setting
including `reportUnclassifiedHashes`. RIPEMD-160 has no practical collision
attack, so the impact is lower than an MD5 or SHA-1 miss, but the rule
advertises RIPEMD coverage in its description and demonstrates it with the one
spelling it could not see.
