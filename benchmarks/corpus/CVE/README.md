# CVE Corpus — Real Historical Exploits

> **Why this corpus exists.** Synthetic Juliet fixtures and Wild OSS code both have a labeling problem: we wrote the labels (Juliet) or there are no labels (Wild). The CVE corpus solves both — every fixture is a code excerpt from a published advisory, where the **CVE assignment itself is the ground-truth label**, adjudicated by the security community, not by us.
>
> Closes Gap D in `benchmarks/FP_FN_REMEDIATION_TRACKER.md` §4 P2.

## Scope

This corpus targets **the top 50 npm advisories of the last 2 years** that have a JavaScript/TypeScript code-level fix (i.e. not infra/build-system advisories). Selection criteria below.

## Layout

```
corpus/CVE/
├── README.md                                   # this file
├── policy.md                                   # curation + selection criteria (you write this once; revisit yearly)
└── CVE-YYYY-NNNNN-<short-slug>/
    ├── manifest.json                           # schema below
    ├── vulnerable/<file>.js                    # code as-it-was BEFORE the fix
    └── safe/<file>.js                          # code as-it-is AFTER the fix
```

## Manifest schema

```json
{
  "cve": "CVE-2024-28849",
  "ghsa": "GHSA-wf5p-g6vw-rhxx",
  "cwe": "CWE-200",
  "owasp": "A04:2021",
  "package": "axios",
  "vulnerableVersions": "<1.6.8",
  "fixedVersion": "1.6.8",
  "summary": "axios drops Authorization header on cross-host redirect — but not on subdomain change",
  "publishedAt": "2024-03-14",
  "fixCommit": "https://github.com/axios/axios/commit/0a6e91a9...",
  "expectedPlugins": ["eslint-plugin-secure-coding"],
  "expectedRules": [
    "secure-coding/no-credential-leak-on-redirect"
  ],
  "fixtures": {
    "vulnerable": [
      { "file": "interceptor.js", "description": "Pre-fix redirect handler that retains Authorization across domains" }
    ],
    "safe": [
      { "file": "interceptor-fixed.js", "description": "Post-fix handler that strips credentials on host change" }
    ]
  },
  "fixtureMetadataRequired": true,
  "notes": "The fix is a 30-line change in lib/adapters/http.js. We extract the relevant interceptor into a standalone fixture."
}
```

The fixture files themselves carry the standard metadata header (`@author`, `@reviewedBy`, `@lastReviewed`, `@cwe`, `@expected`).

## Selection criteria

A CVE qualifies for the corpus if **all** are true:

1. **Published in the last 2 years** (rolling window — anything older is presumed addressed by mainstream tooling).
2. **CVSS 3.1 base score ≥ 7.0** (high-severity).
3. **Has a code-level fix in JS/TS** — config-only, infra-only, or build-system fixes don't count.
4. **The vulnerable code is < 100 lines** that can be extracted without losing context.
5. **The fix is a focused diff** (≤ 30 LoC of JS/TS changed) — broad refactors are too noisy to label cleanly.
6. **An ESLint rule could plausibly catch it** — file an issue if a CVE is interesting but no rule pattern exists yet (it becomes a `recommended`-tier candidate).

## Curation workflow

```bash
# 1. List recent advisories scoring ≥ 7.0
gh api 'graphql' -f query='query { securityVulnerabilities(severity: HIGH, ecosystem: NPM, first: 50, orderBy: { field: UPDATED_AT, direction: DESC }) { nodes { advisory { ghsaId summary } package { name } vulnerableVersionRange firstPatchedVersion { identifier } } } }' > /tmp/advisories.json

# 2. For each candidate, fetch the fix commit, extract the relevant snippet
# (typically the function or block the diff touched), label per the manifest schema.

# 3. Write fixture files with metadata headers.

# 4. Update this directory's index in FP_FN_REMEDIATION_TRACKER.md.

# 5. Validate:
npm run ilb:validate-fixtures:strict
```

## Status (as of 2026-05-09)

- **Scaffolded:** 2 example CVE directories (placeholder content — not yet curated)
  - `CVE-2018-7166-buffer-uninitialized/` (Node `new Buffer(size)`, addressed by `node-security/no-deprecated-buffer`)
  - `CVE-2024-28849-axios-credential-leak/` (axios cross-host redirect leak, no rule yet — `secure-coding/no-credential-leak-on-redirect` is a candidate)
- **Target by Q4 2026:** 50 curated CVEs covering CWE-Top-25.
- **Owner:** assign one engineer; ~5 days of focused curation.

## What this corpus is NOT

- **Not** a substitute for Juliet. Juliet is breadth across CWE patterns; CVE corpus is depth on real exploits. Run both.
- **Not** a fixture for **us-vs-competitors** runs. CVE corpus is internal-quality-only — we use it to detect when our rules silently miss real exploits, not to claim victory over sonarjs.
- **Not** auto-extracted. Every fixture must be human-curated to ensure the extracted snippet is faithful and self-contained.
