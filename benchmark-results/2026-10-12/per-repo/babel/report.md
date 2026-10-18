# ILB-Wild — babel

> Pinned: `3b4cbdcfb7f974cad9bc11681353bf515cd72559` · 43K ⭐ · Compiler (FP corpus)
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 41 |
| Lines of code | 24,412 |
| Total findings | 2 (1 errors, 1 warnings) |
| Findings density | **0.08 / kLoC** |
| Files with findings | 2 (4.9%) |
| Wall-clock (median, 3 runs) | **2282 ms** (±161, CV 7.4%) |
| Per-file lint cost | 55.66 ms/file |
| Peak RSS | 501 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| secure-coding | 2 / 34 | 5.9% |
| node-security | 0 / 43 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-sensitive-data-exposure` | 1 | 4.66 ms |
| `secure-coding/no-unsafe-regex-construction` | 1 | 2.03 ms |
| `secure-coding/no-privilege-escalation` | 0 | 56.72 ms |
| `secure-coding/no-ldap-injection` | 0 | 33.83 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 20.99 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 12.12 ms |
| `node-security/no-unsafe-buffer-alloc` | 0 | 12.65 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 7.66 ms |
| `node-security/no-timing-unsafe-compare` | 0 | 11.45 ms |
| `secure-coding/no-redos-vulnerable-regex` | 0 | 11.01 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-privilege-escalation` | 56.72 ms | 0 |
| `secure-coding/no-ldap-injection` | 33.83 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 20.99 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 12.65 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 12.12 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 11.45 ms | 0 |
| `secure-coding/no-redos-vulnerable-regex` | 11.01 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 7.66 ms | 0 |
| `secure-coding/no-xxe-injection` | 6.5 ms | 0 |
| `secure-coding/no-homoglyph-identifiers` | 5.73 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-sensitive-data-exposure` — /Users/ofri/repos/ofriperetz.dev/oos/babel/packages/babel-parser/src/plugin-utils.ts:59 — 🔒 CWE-532 OWASP:A09-Logging CVSS:5.3 \| Sensitive data detected in error messages: token \| HIGH [GDPR,HIPAA,PCI-DSS,SOC2] Fix: Redact or mask sensitive data before logging/exposing \| https://cwe.mitre.org/data/definitions/532.html
- `secure-coding/no-unsafe-regex-construction` — /Users/ofri/repos/ofriperetz.dev/oos/babel/packages/babel-parser/src/plugins/estree.ts:41 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Dynamic regex flags: Dynamic flags can lead to unexpected behavior or security issues \| HIGH Fix: Use static flags instead of dynamic flags \| https://owasp.org/www-community/attacks/Regular_expres

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/babel-parser/src/**/*.{js,ts}`
