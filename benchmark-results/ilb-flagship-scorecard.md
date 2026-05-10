# ILB-Flagship Scorecard

> Per-rule × per-repo: latency (cached + uncached), findings, head-to-head overlap, and synthetic-corpus P/R/F1. Generated from `2026-05-10.json`.

- **Generated**: 2026-05-10T16:50:19.028Z · **Schema**: ilb-flagship/v2
- **ESLint**: v9.39.4 · **oxlint**: Version: 1.63.0 · **Node**: v24.13.0
- **OOS root**: `/Users/ofri/repos/ofriperetz.dev/oos`

## 1. Latency (cold → warm) and findings count

| Rule | Repo | ⭐ | Tier | Ours cold | Ours warm | Ours findings | Comp cold | Comp warm | Comp findings | oxlint cold | oxlint warm | oxlint findings |
| :--- | :--- | ---: | :---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `import-next/no-cycle` | next.js | 131K | T1 | 20651 ms | 470 ms | 5243 | 25866 ms | 410 ms | 0 | 152 ms | 145 ms | 17 |
| `pg/no-unsafe-query` | supabase | 78K | T1 | 15568 ms | 714 ms | 0 | — | — | — | — | — | — |
| `secure-coding/no-hardcoded-credentials` | vercel-ai | 15K | T2 | 2233 ms | 309 ms | 0 | 2840 ms | 295 ms | 380 | — | — | — |
| `secure-coding/no-redos-vulnerable-regex` | lodash | 60K | T1 | 228 ms | 194 ms | 1 | 233 ms | 190 ms | 0 | — | — | — |
| `mongodb-security/no-unsafe-query` | payload | 35K | T2 | 3855 ms | 444 ms | 233 | — | — | — | — | — | — |
| `jwt/no-algorithm-none` | supabase | 78K | T1 | 15430 ms | 1276 ms | 0 | — | — | — | — | — | — |
| `browser-security/no-postmessage-wildcard-origin` | next.js | 131K | T1 | 19570 ms | 394 ms | 2 | — | — | — | — | — | — |
| `react-features/hooks-exhaustive-deps` | next.js | 131K | T1 | 20272 ms | 426 ms | 102 | 19696 ms | 410 ms | 44 | 81 ms | 59 ms | 0 |
| `react-a11y/alt-text` | shadcn-ui | 100K | T1 | 4502 ms | 432 ms | 0 | 4843 ms | 488 ms | 0 | 87 ms | 86 ms | 0 |
| `vercel-ai-security/no-unsafe-output-handling` | vercel-ai | 15K | T2 | 2218 ms | 293 ms | 0 | — | — | — | — | — | — |

## 2. Cache effectiveness (median across rules)

| Stack | Median cold | Median warm | Δ | Cache benefit |
| :--- | ---: | ---: | ---: | ---: |
| Ours (ESLint) | 9966 ms | 429 ms | 9537 ms | 96% |
| Competitor (ESLint) | 4843 ms | 410 ms | 4433 ms | 92% |
| oxlint native (competitor) | 87 ms | 86 ms | 1 ms | 1% |

## 3. Synthetic corpus — true precision / recall / F1

Labeled fixtures from `benchmarks/corpus/CWE-NNN/{vulnerable,safe}`. Tiny — 3 vuln + 3 safe per CWE — but ground-truthed.

| Rule | CWE | Stack | Precision | Recall | F1 | TP | FP | FN | TN |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `pg/no-unsafe-query` | CWE-089 | ours | 100% | 100% | 1.00 | 3 | 0 | 0 | 3 |
| `secure-coding/no-hardcoded-credentials` | CWE-798 | ours | 100% | 100% | 1.00 | 2 | 0 | 0 | 2 |
| `secure-coding/no-hardcoded-credentials` | CWE-798 | competitor | 100% | 50% | 0.67 | 1 | 0 | 1 | 2 |

## 4. OSS findings overlap — both / ours-only / theirs-only

Set ops on `(file, line)` keys between our cold-run findings and the competitor's on the same OSS repo.

- **both** = same file:line flagged by both rules → likely true positive
- **ours-only** = we flagged, they did not → either better recall or our FP (manual triage required)
- **theirs-only** = they flagged, we did not → either their better recall or their FP (this is "where they beat us")

| Rule | Repo | Both | Ours-only | Theirs-only |
| :--- | :--- | ---: | ---: | ---: |
| `import-next/no-cycle` | next.js | 0 | 1114 | 0 |
| `secure-coding/no-hardcoded-credentials` | vercel-ai | 0 | 0 | 379 |
| `secure-coding/no-redos-vulnerable-regex` | lodash | 0 | 1 | 0 |
| `react-features/hooks-exhaustive-deps` | next.js | 22 | 76 | 0 |
| `react-a11y/alt-text` | shadcn-ui | 0 | 0 | 0 |

## 5. Where competitors beat us (theirs-only samples, top 5 each)

Each row is a finding the competitor caught that ours missed. Triage to determine FN-on-our-side vs FP-on-theirs.

### `secure-coding/no-hardcoded-credentials` on vercel-ai — 379 theirs-only finding(s)

| File | Line | Message |
| :--- | ---: | :--- |
| `packages/ai/scripts/check-bundle-size.ts` | 109 | Found a string with entropy 4.23 : "https://github.com/vercel/ai/settings/variables/actions/BUNDLE_SIZE_LIMIT_KB" |
| `packages/ai/src/agent/tool-loop-agent.test-d.ts` | 17 | Found a string with entropy 4.12 : "ToolLoopAgentOnFinishCallback" |
| `packages/ai/src/agent/tool-loop-agent.test-d.ts` | 31 | Found a string with entropy 4.12 : "ToolLoopAgentOnFinishCallback" |
| `packages/ai/src/generate-text/language-model-events.ts` | 58 | Found a string with entropy 4.04 : "`experimental_onLanguageModelCallStart`" |
| `packages/ai/src/generate-text/language-model-events.ts` | 70 | Found a string with entropy 4.03 : "`experimental_onLanguageModelCallEnd`" |


## 6. Where we beat competitors (ours-only samples, top 5 each)

Each row is a finding ours caught that theirs missed. Triage same way — could be a real recall win or our FP.

### `import-next/no-cycle` on next.js — 1114 ours-only finding(s)

| File | Line | Message |
| :--- | ---: | :--- |
| `packages/next/src/build/analysis/get-page-static-info.ts` | 1 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| CRITICAL ·    Fix: Split get-page-static-info into .core and .extended \| https://en.wikipedia.org/wiki/Circular_dependency |
| `packages/next/src/build/analysis/get-page-static-info.ts` | 2 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| CRITICAL ·    Fix: Split get-page-static-info into .core and .extended \| https://en.wikipedia.org/wiki/Circular_dependency |
| `packages/next/src/build/analysis/get-page-static-info.ts` | 10 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| CRITICAL ·    Fix: Split get-page-static-info into .core and .extended \| https://en.wikipedia.org/wiki/Circular_dependency |
| `packages/next/src/build/analysis/get-page-static-info.ts` | 12 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| CRITICAL ·    Fix: Split get-page-static-info into .core and .extended \| https://en.wikipedia.org/wiki/Circular_dependency |
| `packages/next/src/build/analysis/get-page-static-info.ts` | 15 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| CRITICAL ·    Fix: Split get-page-static-info into .core and .extended \| https://en.wikipedia.org/wiki/Circular_dependency |

### `secure-coding/no-redos-vulnerable-regex` on lodash — 1 ours-only finding(s)

| File | Line | Message |
| :--- | ---: | :--- |
| `lib/main/build-doc.js` | 65 | 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Nested Repetition: Quantifiers nested within groups with quantifiers \| CRITICAL ·    Fix: Flatten nested quantifiers \| https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS |

### `react-features/hooks-exhaustive-deps` on next.js — 76 ours-only finding(s)

| File | Line | Message |
| :--- | ---: | :--- |
| `packages/next/src/client/app-call-server.ts` | 22 | ⚠️ React Hook useCallback has missing dependencies: startTransition, actionPayload, type \| HIGH ·    Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies |
| `packages/next/src/client/app-dir/link.tsx` | 395 | ⚠️ React Hook useMemo has missing dependencies: formatStringOrUrl, href, as \| HIGH ·    Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies |
| `packages/next/src/client/app-dir/link.tsx` | 461 | ⚠️ React Hook useCallback has missing dependencies: previousAs, previousHref, el \| HIGH ·    Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies |
| `packages/next/src/client/app-dir/link.tsx` | 486 | ⚠️ React Hook useEffect has unnecessary dependency: as \| MEDIUM ·    Fix: Remove the unnecessary dependency from the array - it never changes or is not used in the effect \| https://react.dev/reference/react/useEffect#removing-unnecessary-dependencies |
| `packages/next/src/client/components/app-router-announcer.tsx` | 42 | ⚠️ React Hook useEffect has missing dependencies: getAnnouncerNode \| HIGH ·    Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies |


## 7. Green-field rule samples (no competitor)

### `mongodb-security/no-unsafe-query` on payload — 233 finding(s) (showing top 5)

| File | Line | Message |
| :--- | ---: | :--- |
| `packages/db-mongodb/src/updateGlobal.ts` | 36 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/updateGlobal.ts` | 40 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/upsert.ts` | 10 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "collection" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/upsert.ts` | 11 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "data" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| https:// |
| `packages/db-mongodb/src/upsert.ts` | 12 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "locale" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| https: |

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
