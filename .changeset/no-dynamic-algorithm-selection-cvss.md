---
'eslint-plugin-node-security': patch
---

Align `no-dynamic-algorithm-selection`'s `meta.docs.cvss` (7.4) to the CVSS its
finding actually emits. The rule's message carries `CWE-327` and sets no
per-message `cvss`, so it inherits `CWE_MAPPING['CWE-327']` = 7.5 via
`enrichFromCWE` — docs now match the emitted value. Surfaced by the
cross-plugin `security-cvss-docs-consistency.lock.test.ts` lock (added in #213),
which turned main red when this rule landed concurrently with the CVSS sweep.
Documentation-metadata only; no emitted finding changes.
