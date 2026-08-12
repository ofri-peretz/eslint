---
'eslint-plugin-node-security': minor
---

`no-weak-hash-algorithm`: exempt hashes stored under a non-cryptographic name.

```ts
// redis/ioredis lib/Script.ts:15
this.sha = createHash('sha1').update(lua).digest('hex');
```

SHA-1 *is* used, so the detection was correct — but this is the EVALSHA script
identifier the Redis wire protocol mandates. The algorithm is not the
maintainer's choice, and no attack on SHA-1's collision resistance buys
anything: the value indexes a script the server already holds. A maintainer
reading `CWE-327 | CRITICAL` here correctly concludes the tool does not
understand their code.

A hash assigned to a name in `nonCryptographicNames` (default `sha`, `etag`,
`cachekey`, `cachebuster`; matched case-insensitively with `_` and `-`
stripped) is no longer reported. Measured over the 8-repo corpus: **7 findings
→ 6**, and the ioredis case goes to 0.

The exemption is deliberately narrow — it is about where the value **lands**,
not which API produced it. The rule walks out through the
`.update(…).digest(…)` receiver chain and reads the assignment target. A hash
that is returned, passed as an argument, compared, or stored under a computed
key is still reported, so "call it `sha`" cannot become a way to silence the
rule on a real security control. `nonCryptographicNames: []` disables the
exemption entirely.

The message now names the distinction, so a reader in the non-crypto case can
tell which side they are on.

Known remaining shape, not covered here: Shopify/cli's
`packages/theme/src/cli/utilities/asset-checksum.ts` does `return md5(content)`
from functions named `*Checksum`. The non-cryptographic name is on the
enclosing function rather than an assignment target, and matching function
names by substring would exempt `passwordChecksum` too — a worse trade than
the two findings it removes.
