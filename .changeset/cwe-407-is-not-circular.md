---
'eslint-plugin-import-next': patch
'@interlace/eslint-devkit': patch
---

`no-cycle` cites CWE-1047, and CWE-407 gets its real name back.

`CWE_MAPPING` carried **CWE-407** under the name "Circular Dependencies".
CWE-407 is **"Inefficient Algorithmic Complexity"** — quadratic blowup, a hash
table degrading to a list, a regex that backtracks. `import-next/no-cycle` was
pointed at it on the strength of that name.

The correct identifier is **CWE-1047, "Modules with Circular Dependencies"**,
which sits in the Software Development view as a quality weakness. It was
already referenced by `no-relative-packages` and was **not in the table at
all**, so that rule silently received no enrichment.

`no-cycle` also rendered a line that argued with itself:

```
🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 | Circular dependency detected | CRITICAL
```

CVSS 5.3 is the MEDIUM band, and `meta.docs.cvss` said 9.5 — the band reserved
for remote code execution, for a circular import. Now all three agree:

```
🏗️ CWE-1047 OWASP:A06-Insecure CVSS:5.3 | Circular dependency detected | MEDIUM
```

New gate `npm run lint:severity-consistency`. Across the built plugins, 432
messages render both a CVSS score and a severity label and **165 of them —
38.2% — disagree**. Which value is right is a per-rule judgment, so the gate
does not pick: it records the existing set and fails on a new one, or on a
registry entry whose rule no longer disagrees.
