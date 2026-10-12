# ILB-Wild — shadcn-ui

> Pinned: `50239387ab580bec9cdf3afc925050e86c3488ed` · 100K ⭐ · UI Library

## Summary

| Metric | Value |
|---|---|
| Files linted | 121 |
| Lines of code | 24,293 |
| Total findings | 5 (5 errors, 0 warnings) |
| Findings density | **0.21 / kLoC** |
| Files with findings | 5 (4.1%) |
| Wall-clock (median, 3 runs) | **4259 ms** (±339, CV 8.4%) |
| Per-file lint cost | 35.2 ms/file |
| Peak RSS | 541 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 0 / 46 | 0% |
| secure-coding | 2 / 34 | 5.9% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 4 | 1390.24 ms |
| `secure-coding/no-hardcoded-credentials` | 1 | 23.26 ms |
| `browser-security/no-http-urls` | 0 | 79.89 ms |
| `secure-coding/no-privilege-escalation` | 0 | 52.1 ms |
| `secure-coding/no-ldap-injection` | 0 | 37.02 ms |
| `browser-security/no-innerhtml` | 0 | 28.17 ms |
| `browser-security/no-eval` | 0 | 23.73 ms |
| `browser-security/no-websocket-eval` | 0 | 21.49 ms |
| `browser-security/no-postmessage-innerhtml` | 0 | 16.08 ms |
| `browser-security/no-websocket-innerhtml` | 0 | 14.98 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 1390.24 ms | 4 |
| `browser-security/no-http-urls` | 79.89 ms | 0 |
| `secure-coding/no-privilege-escalation` | 52.1 ms | 0 |
| `secure-coding/no-ldap-injection` | 37.02 ms | 0 |
| `browser-security/no-innerhtml` | 28.17 ms | 0 |
| `browser-security/no-eval` | 23.73 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 23.26 ms | 1 |
| `browser-security/no-websocket-eval` | 21.49 ms | 0 |
| `browser-security/no-postmessage-innerhtml` | 16.08 ms | 0 |
| `browser-security/no-filereader-innerhtml` | 15.17 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/shadcn-ui/packages/shadcn/src/utils/get-monorepo-info.ts:139 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/shadcn-ui/packages/shadcn/src/utils/compare.ts:34 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/shadcn-ui/packages/shadcn/src/utils/transformers/transform-icons.ts:53 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/shadcn-ui/packages/shadcn/src/utils/transformers/transform-font.ts:14 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Credential value detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] Fix: Use environment variable: process.env.SUPPORT_TOKEN or secret management service \| https://cwe.mitre.org/data/de
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/shadcn-ui/packages/shadcn/src/templates/create-template.ts:147 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/**/*.{ts,tsx}`
