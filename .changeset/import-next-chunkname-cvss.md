---
'eslint-plugin-import-next': patch
'oxlint-plugin-import-next': patch
---

fix(import-next): dynamic-import-chunkname messages state CVSS 2.5, matching their LOW label

The three messages cited CWE-1078 and so rendered its generic score, 5.3 (the
MEDIUM band), beside a LOW label. A chunk-naming slip is hygiene, not a
vulnerability, so each message now states the 2.5 its `meta.docs.cvss` already
declared. Message text only; what the rule reports is unchanged.
