# ILB-Wild — langchain-js

> Pinned: `38f82942e77bf87c138ded6f08cb875bb6fb9ba7` · 15K ⭐ · AI Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 243 |
| Lines of code | 48,076 |
| Total findings | 5 (3 errors, 2 warnings) |
| Findings density | **0.1 / kLoC** |
| Files with findings | 4 (1.6%) |
| Wall-clock (median, 3 runs) | **2563 ms** (±58, CV 2.3%) |
| Per-file lint cost | 10.55 ms/file |
| Peak RSS | 642 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| vercel-ai-security | 0 / 19 | 0% |
| node-security | 1 / 43 | 2.3% |
| secure-coding | 2 / 34 | 5.9% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 3 | 160.02 ms |
| `node-security/no-unsafe-buffer-alloc` | 1 | 15.42 ms |
| `secure-coding/no-sensitive-data-exposure` | 1 | 11.82 ms |
| `vercel-ai-security/require-validated-prompt` | 0 | 76.58 ms |
| `secure-coding/no-privilege-escalation` | 0 | 43.09 ms |
| `secure-coding/no-ldap-injection` | 0 | 48.38 ms |
| `node-security/no-timing-unsafe-compare` | 0 | 27.76 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 21.16 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 20.74 ms |
| `secure-coding/no-homoglyph-identifiers` | 0 | 8.46 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 160.02 ms | 3 |
| `vercel-ai-security/require-validated-prompt` | 76.58 ms | 0 |
| `secure-coding/no-ldap-injection` | 48.38 ms | 0 |
| `secure-coding/no-privilege-escalation` | 43.09 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 27.76 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 21.16 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 20.74 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 15.42 ms | 1 |
| `secure-coding/no-sensitive-data-exposure` | 11.82 ms | 1 |
| `secure-coding/no-graphql-injection` | 9.82 ms | 0 |

## Sample findings (first 15)

- `node-security/no-unsafe-buffer-alloc` — /Users/ofri/repos/ofriperetz.dev/oos/langchain-js/libs/langchain-core/src/utils/event_source_parse.ts:232 — 🔒 CWE-789 CVSS:7.5 \| The allocation size is read off the wire, so the peer picks it. For `new Array(n)` the hazard is a narrow band, not "large n": V8 keeps a packed backing store only up to ~33.5M elements, and a length just under that tu
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/langchain-js/libs/langchain-core/src/utils/zod-to-json-schema/parsers/string.ts:38 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Ambiguous alternation (exponential backtracking): Alternatives inside a quantified group match the same input, so every character can be taken by either branch and the engine explores 2^n paths befor
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/langchain-js/libs/langchain-core/src/output_parsers/structured.ts:113 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/langchain-js/libs/langchain-core/src/output_parsers/structured.ts:115 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-sensitive-data-exposure` — /Users/ofri/repos/ofriperetz.dev/oos/langchain-js/libs/langchain-core/src/callbacks/manager.ts:294 — 🔒 CWE-532 OWASP:A09-Logging CVSS:5.3 \| Sensitive data detected in logs: token \| HIGH [GDPR,HIPAA,PCI-DSS,SOC2] Fix: Redact or mask sensitive data before logging/exposing \| https://cwe.mitre.org/data/definitions/532.html

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `libs/langchain-core/src/**/*.ts`
