# ILB-Flagship Scorecard

> Per-rule × per-repo: latency (cached + uncached), findings, head-to-head overlap, and synthetic-corpus P/R/F1. Generated from `2026-09-28.json`.

- **Generated**: 2026-09-28T18:40:13.872Z · **Schema**: ilb-flagship/v2
- **ESLint**: v9.39.4 · **oxlint**: 1.63.0 · **Node**: v24.21.0
- **OOS root**: `/home/runner/work/eslint/eslint/oos`

## 1. Latency (cold → warm) and findings count

| Rule                                              | Repo      |   ⭐ | Tier | Ours cold | Ours warm | Ours findings | Comp cold | Comp warm | Comp findings | oxlint cold | oxlint warm | oxlint findings |
| :------------------------------------------------ | :-------- | ---: | :--: | --------: | --------: | ------------: | --------: | --------: | ------------: | ----------: | ----------: | --------------: |
| `import-next/no-cycle`                            | next.js   | 131K |  T1  | 48,565 ms |    688 ms |            12 | 64,267 ms |    719 ms |             0 |    1,013 ms |    1,024 ms |              92 |
| `pg/no-unsafe-query`                              | supabase  |  78K |  T1  | 40,704 ms |  1,374 ms |             0 |         — |         — |             — |           — |           — |               — |
| `secure-coding/no-hardcoded-credentials`          | vercel-ai |  15K |  T2  |  8,871 ms |    654 ms |           922 | 11,008 ms |    605 ms |           494 |           — |           — |               — |
| `secure-coding/no-redos-vulnerable-regex`         | lodash    |  60K |  T1  |    375 ms |    298 ms |             1 |    422 ms |    319 ms |             0 |           — |           — |               — |
| `mongodb-security/no-unsafe-query`                | payload   |  35K |  T2  |  9,547 ms |    761 ms |           274 |         — |         — |             — |           — |           — |               — |
| `jwt/no-algorithm-none`                           | supabase  |  78K |  T1  | 39,963 ms |  1,366 ms |             0 |         — |         — |             — |           — |           — |               — |
| `browser-security/no-postmessage-wildcard-origin` | next.js   | 131K |  T1  | 48,677 ms |    687 ms |             2 |         — |         — |             — |           — |           — |               — |
| `react-features/hooks-exhaustive-deps`            | next.js   | 131K |  T1  | 47,817 ms |    694 ms |           149 | 48,331 ms |    747 ms |            53 |      465 ms |      433 ms |              22 |
| `react-a11y/alt-text`                             | shadcn-ui | 100K |  T1  |    283 ms |    286 ms |             0 | 11,237 ms |    769 ms |             0 |      140 ms |      147 ms |               0 |
| `vercel-ai-security/no-unsafe-output-handling`    | vercel-ai |  15K |  T2  |  8,378 ms |    606 ms |             0 |         — |         — |             — |           — |           — |               — |

## 2. Cache effectiveness (median across rules)

| Stack                | Median cold | Median warm |         Δ | Cache benefit |
| :------------------- | ----------: | ----------: | --------: | ------------: |
| Ours (ESLint)        |   24,755 ms |      688 ms | 24,067 ms |           97% |
| Peer (ESLint)        |   11,237 ms |      719 ms | 10,518 ms |           94% |
| oxlint native (peer) |      465 ms |      433 ms |     32 ms |            7% |

## 3. Synthetic corpus — true precision / recall / F1

Labeled fixtures from `benchmarks/corpus/CWE-NNN/{vulnerable,safe}`. Tiny — 3 vuln + 3 safe per CWE — but ground-truthed.

| Rule                                     | CWE     | Stack      | Precision | Recall |   F1 |  TP |  FP |  FN |  TN |
| :--------------------------------------- | :------ | :--------- | --------: | -----: | ---: | --: | --: | --: | --: |
| `pg/no-unsafe-query`                     | CWE-089 | ours       |         — |     0% |    — |   0 |   0 |   3 |   3 |
| `secure-coding/no-hardcoded-credentials` | CWE-798 | ours       |       83% |    71% | 0.77 |   5 |   1 |   2 |   5 |
| `secure-coding/no-hardcoded-credentials` | CWE-798 | competitor |      100% |    57% | 0.73 |   4 |   0 |   3 |   6 |

## 4. OSS findings overlap — both / ours-only / theirs-only

Set ops on `(file, line)` keys between our cold-run findings and the competitor's on the same OSS repo.

- **both** = same file:line flagged by both rules → likely true positive
- **ours-only** = we flagged, they did not → either better recall or our FP (manual triage required)
- **theirs-only** = they flagged, we did not → either their better recall or their FP (this is "where they beat us")

| Rule                                      | Repo      | Both | Ours-only | Theirs-only |
| :---------------------------------------- | :-------- | ---: | --------: | ----------: |
| `import-next/no-cycle`                    | next.js   |    0 |        12 |           0 |
| `secure-coding/no-hardcoded-credentials`  | vercel-ai |   46 |       876 |         434 |
| `secure-coding/no-redos-vulnerable-regex` | lodash    |    0 |         1 |           0 |
| `react-features/hooks-exhaustive-deps`    | next.js   |    3 |       141 |          28 |
| `react-a11y/alt-text`                     | shadcn-ui |    0 |         0 |           0 |

## 5. Where competitors beat us (theirs-only samples, top 5 each)

Each row is a finding the competitor caught that ours missed. Triage to determine FN-on-our-side vs FP-on-theirs.

### `secure-coding/no-hardcoded-credentials` on vercel-ai — 434 theirs-only finding(s)

| File                                                       | Line | Message                                                                                                                                                                                                  |
| :--------------------------------------------------------- | ---: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/docs/app/[lang]/unauthenticated-ai-gateway/page.tsx` |   44 | Found a string with entropy 4.77 : "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys%3Futm_source%3Dgateway-models-page%26showCreateKeyModal%3Dtrue&title=Get+Started+with+Vercel+AI+Gateway" |
| `apps/docs/app/[lang]/unauthenticated-ai-gateway/page.tsx` |   51 | Found a string with entropy 4.11 : "AI_GATEWAY_API_KEY=your_api_key_here"                                                                                                                                |
| `apps/docs/components/docs/template-icons.tsx`             |   34 | Found a string with entropy 4.08 : "url(#paint0_linear_53_108l7vf6bcgb)"                                                                                                                                 |
| `apps/docs/components/docs/template-icons.tsx`             |   42 | Found a string with entropy 4.08 : "url(#paint1_linear_53_108l7vf6bcgb)"                                                                                                                                 |
| `apps/docs/components/docs/template-icons.tsx`             |   47 | Found a string with entropy 4.28 : "paint0_linear_53_108l7vf6bcgb"                                                                                                                                       |

### `react-features/hooks-exhaustive-deps` on next.js — 28 theirs-only finding(s)

| File                                                                                                   |  Line | Message                                                                                                    |
| :----------------------------------------------------------------------------------------------------- | ----: | :--------------------------------------------------------------------------------------------------------- |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.browser.development.js` | 10671 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.browser.production.js`  |  3648 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.node.development.js`    | 10671 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.node.production.js`     |  3696 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server.browser.development.js`        | 11305 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |

## 6. Where we beat competitors (ours-only samples, top 5 each)

Each row is a finding ours caught that theirs missed. Triage same way — could be a real recall win or our FP.

### `import-next/no-cycle` on next.js — 12 ours-only finding(s)

| File                                                                    | Line | Message                                                                                                                                                                                                                                                                                    |
| :---------------------------------------------------------------------- | ---: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/next/src/client/components/segment-cache/lru.ts`              |    3 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| MEDIUM · Fix: Extract shared types to - export type lruId, schedulerId · - export interface lruSummary, schedulerSummary file \| https://en.wikipedia.org/wiki/Dependency_inversion_principle                    |
| `packages/next/src/client/components/segment-cache/scheduler.ts`        |   48 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| MEDIUM · Fix: Extract shared types to - export type schedulerId, lruId · - export interface schedulerSummary, lruSummary file \| https://en.wikipedia.org/wiki/Dependency_inversion_principle                    |
| `packages/next/src/client/with-router.tsx`                              |    7 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| MEDIUM · Fix: Extract shared types to - export type with-routerId, routerId · - export interface with-routerSummary, routerSummary file \| https://en.wikipedia.org/wiki/Dependency_inversion_principle          |
| `packages/next/src/client/with-router.tsx`                              |    8 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| MEDIUM · Fix: Extract shared types to - export type with-routerId, routerId · - export interface with-routerSummary, routerSummary file \| https://en.wikipedia.org/wiki/Dependency_inversion_principle          |
| `packages/next/src/server/app-render/console-async-storage-instance.ts` |    2 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| MEDIUM · Fix: Extract shared types to - export type console-async-storage-instanceId, console-async-storage.externalId · - export interface console-async-storage-instanceSummary, console-async-storage.externa |

### `secure-coding/no-hardcoded-credentials` on vercel-ai — 876 ours-only finding(s)

| File                                      | Line | Message                                                                                                                                                                                                                                                  |
| :---------------------------------------- | ---: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/docs/components/recipes/guides.tsx` |   31 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] · Fix: Use environment variable: process.env.PATH or secret management service \| https://cwe.mitre.org/data/definitions/798.html    |
| `apps/docs/components/recipes/guides.tsx` |   37 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] · Fix: Use environment variable: process.env.PATH or secret management service \| https://cwe.mitre.org/data/definitions/798.html    |
| `apps/docs/lib/example-redirects.ts`      |  702 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] · Fix: Use environment variable: process.env.SOURCE or secret management service \| https://cwe.mitre.org/data/definitions/798.html  |
| `apps/docs/lib/example-redirects.ts`      |  707 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] · Fix: Use environment variable: process.env.SOURCE or secret management service \| https://cwe.mitre.org/data/definitions/798.html  |
| `apps/docs/lib/legacy-redirects.ts`       |   42 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] · Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.html |

### `secure-coding/no-redos-vulnerable-regex` on lodash — 1 ours-only finding(s)

| File                    | Line | Message                                                                                                                                                                                                                                              |
| :---------------------- | ---: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/main/build-doc.js` |   65 | 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Nested Repetition: Quantifiers nested within groups with quantifiers \| CRITICAL · Fix: Flatten nested quantifiers \| https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS |

### `react-features/hooks-exhaustive-deps` on next.js — 141 ours-only finding(s)

| File                                           | Line | Message                                                                                                                                                                                                                                                                                |
| :--------------------------------------------- | ---: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/bundle-analyzer/components/analyzer.tsx` |  221 | ⚠️ React Hook useEffect has unnecessary dependency: comparisonSnapshot \| MEDIUM · Fix: Remove the unnecessary dependency from the array - it never changes or is not used in the effect \| https://react.dev/reference/react/useEffect#removing-unnecessary-dependencies              |
| `apps/bundle-analyzer/components/analyzer.tsx` |  244 | ⚠️ React Hook useEffect has missing dependencies: e, getRootSourceIndex \| HIGH · Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies                     |
| `apps/bundle-analyzer/components/analyzer.tsx` |  252 | ⚠️ React Hook useMemo has missing dependencies: computeActiveEntries, computeModuleDepthMap \| HIGH · Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies |
| `apps/bundle-analyzer/components/analyzer.tsx` |  274 | ⚠️ React Hook useMemo has missing dependencies: sourceIndex \| HIGH · Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies                                 |
| `apps/bundle-analyzer/components/analyzer.tsx` |  286 | ⚠️ React Hook useMemo has missing dependencies: diffSources, index \| HIGH · Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies                          |

## 7. Green-field rule samples (no competitor)

### `mongodb-security/no-unsafe-query` on payload — 274 finding(s) (showing top 5)

| File                                                                    | Line | Message                                                                                                                                                                                                                                                                                       |
| :---------------------------------------------------------------------- | ---: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/db-mongodb/src/predefinedMigrations/migrateLocalizeStatus.ts` |  291 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/predefinedMigrations/migrateLocalizeStatus.ts` |  315 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/updateGlobal.ts`                               |   40 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/updateGlobal.ts`                               |   44 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/upsert.ts`                                     |   10 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "collection" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL ·    Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |

### `browser-security/no-postmessage-wildcard-origin` on next.js — 2 finding(s) (showing top 5)

| File                                                      | Line | Message                                                                                                                                                                                                                                                                                    |
| :-------------------------------------------------------- | ---: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/next/src/compiled/setimmediate/setImmediate.js` |    1 | 🔒 CWE-346 OWASP:A01-Broken CVSS:7.5 \| postMessage with "_" targetOrigin allows any window to receive the message, potentially leaking sensitive data to malicious sites. \| HIGH · Fix: Specify the exact origin of the target window instead of "_". \| https://developer.mozilla.org/e |
| `packages/next/src/compiled/setimmediate/setImmediate.js` |    1 | 🔒 CWE-346 OWASP:A01-Broken CVSS:7.5 \| postMessage with "_" targetOrigin allows any window to receive the message, potentially leaking sensitive data to malicious sites. \| HIGH · Fix: Specify the exact origin of the target window instead of "_". \| https://developer.mozilla.org/e |

---

## How to read this

- **Latency** is single-shot. For SLO-grade numbers use median-of-N (TODO: `--repeat=N`).
- **Cold** = `eslint --no-cache`. **Warm** = `eslint --cache --cache-location <stable>` after a prior cold run.
- **oxlint** caches implicitly (file-mtime + content hash). The "warm" column is the second consecutive run.
- **Findings count** is filtered by the rule's own ID prefix; parser errors and other rules are excluded.
- **Synthetic corpus P/R/F1** are the only numbers here that are ground-truthed. Treat OSS findings as evidence for triage, not as P/R numbers.
- **Overlap**: file:line keying. Same line, same file = "both". A theirs-only finding may be a real FN on our side OR a competitor FP — triage required.
