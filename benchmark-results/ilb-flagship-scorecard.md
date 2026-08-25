# ILB-Flagship Scorecard

> Per-rule × per-repo: latency (cached + uncached), findings, head-to-head overlap, and synthetic-corpus P/R/F1. Generated from `2026-08-25.json`.

- **Generated**: 2026-08-25T13:10:20.552Z · **Schema**: ilb-flagship/v2
- **ESLint**: v9.39.4 · **oxlint**: 1.63.0 · **Node**: v24.19.0
- **OOS root**: `/home/runner/work/eslint/eslint/oos`

## 1. Latency (cold → warm) and findings count

| Rule | Repo | ⭐ | Tier | Ours cold | Ours warm | Ours findings | Comp cold | Comp warm | Comp findings | oxlint cold | oxlint warm | oxlint findings |
| :--- | :--- | ---: | :---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `import-next/no-cycle` | next.js | 131K | T1 | 62,616 ms | 914 ms | 0 | 78,396 ms | 962 ms | 0 | 1,328 ms | 1,367 ms | 91 |
| `pg/no-unsafe-query` | supabase | 78K | T1 | 47,189 ms | 1,718 ms | 0 | — | — | — | — | — | — |
| `secure-coding/no-hardcoded-credentials` | vercel-ai | 15K | T2 | 9,872 ms | 852 ms | 880 | 11,950 ms | 768 ms | 451 | — | — | — |
| `secure-coding/no-redos-vulnerable-regex` | lodash | 60K | T1 | 520 ms | 406 ms | 1 | 539 ms | 434 ms | 0 | — | — | — |
| `mongodb-security/no-unsafe-query` | payload | 35K | T2 | 12,023 ms | 975 ms | 246 | — | — | — | — | — | — |
| `jwt/no-algorithm-none` | supabase | 78K | T1 | 43,670 ms | 1,767 ms | 0 | — | — | — | — | — | — |
| `browser-security/no-postmessage-wildcard-origin` | next.js | 131K | T1 | 55,918 ms | 887 ms | 2 | — | — | — | — | — | — |
| `react-features/hooks-exhaustive-deps` | next.js | 131K | T1 | 54,639 ms | 906 ms | 127 | 57,296 ms | 945 ms | 53 | 529 ms | 532 ms | 22 |
| `react-a11y/alt-text` | shadcn-ui | 100K | T1 | 387 ms | 381 ms | 0 | 14,204 ms | 1,086 ms | 0 | 188 ms | 188 ms | 0 |
| `vercel-ai-security/no-unsafe-output-handling` | vercel-ai | 15K | T2 | 10,092 ms | 807 ms | 0 | — | — | — | — | — | — |

## 2. Cache effectiveness (median across rules)

| Stack | Median cold | Median warm | Δ | Cache benefit |
| :--- | ---: | ---: | ---: | ---: |
| Ours (ESLint) | 27,847 ms | 897 ms | 26,950 ms | 97% |
| Peer (ESLint) | 14,204 ms | 945 ms | 13,259 ms | 93% |
| oxlint native (peer) | 529 ms | 532 ms | -3 ms | -1% |

## 3. Synthetic corpus — true precision / recall / F1

Labeled fixtures from `benchmarks/corpus/CWE-NNN/{vulnerable,safe}`. Tiny — 3 vuln + 3 safe per CWE — but ground-truthed.

| Rule | CWE | Stack | Precision | Recall | F1 | TP | FP | FN | TN |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `pg/no-unsafe-query` | CWE-089 | ours | 100% | 100% | 1.00 | 3 | 0 | 0 | 3 |
| `secure-coding/no-hardcoded-credentials` | CWE-798 | ours | 83% | 100% | 0.91 | 5 | 1 | 0 | 3 |
| `secure-coding/no-hardcoded-credentials` | CWE-798 | competitor | 100% | 80% | 0.89 | 4 | 0 | 1 | 4 |

## 4. OSS findings overlap — both / ours-only / theirs-only

Set ops on `(file, line)` keys between our cold-run findings and the competitor's on the same OSS repo.

- **both** = same file:line flagged by both rules → likely true positive
- **ours-only** = we flagged, they did not → either better recall or our FP (manual triage required)
- **theirs-only** = they flagged, we did not → either their better recall or their FP (this is "where they beat us")

| Rule | Repo | Both | Ours-only | Theirs-only |
| :--- | :--- | ---: | ---: | ---: |
| `import-next/no-cycle` | next.js | 0 | 0 | 0 |
| `secure-coding/no-hardcoded-credentials` | vercel-ai | 41 | 839 | 399 |
| `secure-coding/no-redos-vulnerable-regex` | lodash | 0 | 1 | 0 |
| `react-features/hooks-exhaustive-deps` | next.js | 3 | 122 | 28 |
| `react-a11y/alt-text` | shadcn-ui | 0 | 0 | 0 |

## 5. Where competitors beat us (theirs-only samples, top 5 each)

Each row is a finding the competitor caught that ours missed. Triage to determine FN-on-our-side vs FP-on-theirs.

### `secure-coding/no-hardcoded-credentials` on vercel-ai — 399 theirs-only finding(s)

| File | Line | Message |
| :--- | ---: | :--- |
| `apps/docs/components/docs/template-icons.tsx` | 34 | Found a string with entropy 4.08 : "url(#paint0_linear_53_108l7vf6bcgb)" |
| `apps/docs/components/docs/template-icons.tsx` | 42 | Found a string with entropy 4.08 : "url(#paint1_linear_53_108l7vf6bcgb)" |
| `apps/docs/components/docs/template-icons.tsx` | 47 | Found a string with entropy 4.28 : "paint0_linear_53_108l7vf6bcgb" |
| `apps/docs/components/docs/template-icons.tsx` | 60 | Found a string with entropy 4.28 : "paint1_linear_53_108l7vf6bcgb" |
| `packages/ai/src/agent/tool-loop-agent.test-d.ts` | 24 | Found a string with entropy 4.12 : "ToolLoopAgentOnFinishCallback" |

### `react-features/hooks-exhaustive-deps` on next.js — 28 theirs-only finding(s)

| File | Line | Message |
| :--- | ---: | :--- |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.browser.development.js` | 10667 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.browser.production.js` | 3648 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.node.development.js` | 10667 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.node.production.js` | 3696 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server.browser.development.js` | 11290 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |


## 6. Where we beat competitors (ours-only samples, top 5 each)

Each row is a finding ours caught that theirs missed. Triage same way — could be a real recall win or our FP.

### `secure-coding/no-hardcoded-credentials` on vercel-ai — 839 ours-only finding(s)

| File | Line | Message |
| :--- | ---: | :--- |
| `apps/docs/components/recipes/guides.tsx` | 31 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] ·    Fix: Use environment variable: process.env.PATH or secret management service \| https://cwe.mitre.org/data/definitions/798.html |
| `apps/docs/components/recipes/guides.tsx` | 37 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] ·    Fix: Use environment variable: process.env.PATH or secret management service \| https://cwe.mitre.org/data/definitions/798.html |
| `apps/docs/lib/example-redirects.ts` | 702 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] ·    Fix: Use environment variable: process.env.SOURCE or secret management service \| https://cwe.mitre.org/data/definitions/798.html |
| `apps/docs/lib/example-redirects.ts` | 707 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] ·    Fix: Use environment variable: process.env.SOURCE or secret management service \| https://cwe.mitre.org/data/definitions/798.html |
| `apps/docs/scripts/sync-content.mjs` | 39 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] ·    Fix: Use environment variable: process.env.REF or secret management service \| https://cwe.mitre.org/data/definitions/798.html |

### `secure-coding/no-redos-vulnerable-regex` on lodash — 1 ours-only finding(s)

| File | Line | Message |
| :--- | ---: | :--- |
| `lib/main/build-doc.js` | 65 | 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Nested Repetition: Quantifiers nested within groups with quantifiers \| CRITICAL ·    Fix: Flatten nested quantifiers \| https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS |

### `react-features/hooks-exhaustive-deps` on next.js — 122 ours-only finding(s)

| File | Line | Message |
| :--- | ---: | :--- |
| `apps/bundle-analyzer/app/page.tsx` | 115 | ⚠️ React Hook useEffect has missing dependencies: e, getRootSourceIndex \| HIGH ·    Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies |
| `apps/bundle-analyzer/app/page.tsx` | 123 | ⚠️ React Hook useMemo has missing dependencies: computeActiveEntries, computeModuleDepthMap \| HIGH ·    Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies |
| `apps/bundle-analyzer/app/page.tsx` | 145 | ⚠️ React Hook useMemo has missing dependencies: sourceIndex \| HIGH ·    Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies |
| `apps/bundle-analyzer/components/file-search.tsx` | 36 | ⚠️ React Hook useEffect has missing dependencies: e \| HIGH ·    Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies |
| `apps/bundle-analyzer/components/import-chain.tsx` | 316 | ⚠️ React Hook useMemo has missing dependencies: getModuleIndicesFromSourceIndex, moduleIndex, splitIdent, path, depth, selectedIndex, totalCount, index, async, traced, isFinite, getSourceIndexFromModuleIndex, isAsync, isTraced, a, b, info \| HIGH ·    Fix: Add missing dependencies t |


## 7. Green-field rule samples (no competitor)

### `mongodb-security/no-unsafe-query` on payload — 246 finding(s) (showing top 5)

| File | Line | Message |
| :--- | ---: | :--- |
| `packages/db-mongodb/src/predefinedMigrations/migrateLocalizeStatus.ts` | 291 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/predefinedMigrations/migrateLocalizeStatus.ts` | 315 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/updateGlobal.ts` | 40 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/updateGlobal.ts` | 44 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/upsert.ts` | 10 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "collection" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |

### `browser-security/no-postmessage-wildcard-origin` on next.js — 2 finding(s) (showing top 5)

| File | Line | Message |
| :--- | ---: | :--- |
| `packages/next/src/compiled/setimmediate/setImmediate.js` | 1 | 🔒 CWE-346 OWASP:A01-Broken CVSS:7.5 \| postMessage with "*" targetOrigin allows any window to receive the message, potentially leaking sensitive data to malicious sites. \| HIGH ·    Fix: Specify the exact origin of the target window instead of "*". \| https://developer.mozilla.org/e |
| `packages/next/src/compiled/setimmediate/setImmediate.js` | 1 | 🔒 CWE-346 OWASP:A01-Broken CVSS:7.5 \| postMessage with "*" targetOrigin allows any window to receive the message, potentially leaking sensitive data to malicious sites. \| HIGH ·    Fix: Specify the exact origin of the target window instead of "*". \| https://developer.mozilla.org/e |

---

## How to read this

- **Latency** is single-shot. For SLO-grade numbers use median-of-N (TODO: `--repeat=N`).
- **Cold** = `eslint --no-cache`. **Warm** = `eslint --cache --cache-location <stable>` after a prior cold run.
- **oxlint** caches implicitly (file-mtime + content hash). The "warm" column is the second consecutive run.
- **Findings count** is filtered by the rule's own ID prefix; parser errors and other rules are excluded.
- **Synthetic corpus P/R/F1** are the only numbers here that are ground-truthed. Treat OSS findings as evidence for triage, not as P/R numbers.
- **Overlap**: file:line keying. Same line, same file = "both". A theirs-only finding may be a real FN on our side OR a competitor FP — triage required.
