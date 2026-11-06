# ILB-Flagship Scorecard

> Per-rule × per-repo: latency (cached + uncached), findings, head-to-head overlap, and synthetic-corpus P/R/F1. Generated from `2026-11-06.json`.

- **Generated**: 2026-11-06T17:08:24.274Z · **Schema**: ilb-flagship/v2
- **ESLint**: v9.39.4 · **oxlint**: 1.63.0 · **Node**: v24.22.2
- **OOS root**: `/home/runner/work/eslint/eslint/oos`

## 1. Latency (cold → warm) and findings count

| Rule                                              | Repo      |   ⭐ | Tier | Ours cold | Ours warm | Ours findings | Comp cold | Comp warm | Comp findings | oxlint cold | oxlint warm | oxlint findings |
| :------------------------------------------------ | :-------- | ---: | :--: | --------: | --------: | ------------: | --------: | --------: | ------------: | ----------: | ----------: | --------------: |
| `import-next/no-cycle`                            | next.js   | 131K |  T1  | 50,621 ms |    757 ms |            12 | 66,206 ms |    754 ms |             0 |    1,307 ms |    1,324 ms |              92 |
| `pg/no-unsafe-query`                              | supabase  |  78K |  T1  | 43,096 ms |  1,452 ms |             0 |         — |         — |             — |           — |           — |               — |
| `secure-coding/no-hardcoded-credentials`          | vercel-ai |  15K |  T2  | 10,057 ms |    734 ms |           973 | 12,744 ms |    647 ms |           550 |           — |           — |               — |
| `secure-coding/no-redos-vulnerable-regex`         | lodash    |  60K |  T1  |    384 ms |    301 ms |             1 |    421 ms |    339 ms |             0 |           — |           — |               — |
| `mongodb-security/no-unsafe-query`                | payload   |  35K |  T2  | 10,365 ms |    801 ms |           299 |         — |         — |             — |           — |           — |               — |
| `jwt/no-algorithm-none`                           | supabase  |  78K |  T1  | 41,893 ms |  1,383 ms |             0 |         — |         — |             — |           — |           — |               — |
| `browser-security/no-postmessage-wildcard-origin` | next.js   | 131K |  T1  | 47,615 ms |    727 ms |             2 |         — |         — |             — |           — |           — |               — |
| `react-features/hooks-exhaustive-deps`            | next.js   | 131K |  T1  | 49,400 ms |    735 ms |           147 | 49,177 ms |    813 ms |            53 |      525 ms |      500 ms |              22 |
| `react-a11y/alt-text`                             | shadcn-ui | 100K |  T1  |         — |         — |             — | 12,267 ms |    833 ms |             0 |      170 ms |      177 ms |               0 |
| `vercel-ai-security/no-unsafe-output-handling`    | vercel-ai |  15K |  T2  |  9,882 ms |    645 ms |             1 |         — |         — |             — |           — |           — |               — |

**Failed runs** (linter exited with an error; shown as — above and left out of every median):

- `react-a11y/alt-text` on shadcn-ui: oursEslint cold exited 2
- `react-a11y/alt-text` on shadcn-ui: oursEslint warm exited 2

## 2. Cache effectiveness (median across rules)

| Stack                | Median cold | Median warm |         Δ | Cache benefit |
| :------------------- | ----------: | ----------: | --------: | ------------: |
| Ours (ESLint)        |   41,893 ms |      735 ms | 41,158 ms |           98% |
| Peer (ESLint)        |   12,744 ms |      754 ms | 11,990 ms |           94% |
| oxlint native (peer) |      525 ms |      500 ms |     25 ms |            5% |

## 3. Synthetic corpus — true precision / recall / F1

Labeled fixtures from `benchmarks/corpus/CWE-NNN/{vulnerable,safe}`. Tiny — 3 vuln + 3 safe per CWE — but ground-truthed.

| Rule                                     | CWE     | Stack      | Precision | Recall |   F1 |  TP |  FP |  FN |  TN |
| :--------------------------------------- | :------ | :--------- | --------: | -----: | ---: | --: | --: | --: | --: |
| `pg/no-unsafe-query`                     | CWE-089 | ours       |      100% |    25% | 0.40 |   1 |   0 |   3 |   4 |
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
| `secure-coding/no-hardcoded-credentials`  | vercel-ai |   55 |       918 |         483 |
| `secure-coding/no-redos-vulnerable-regex` | lodash    |    0 |         1 |           0 |
| `react-features/hooks-exhaustive-deps`    | next.js   |    3 |       140 |          28 |
| `react-a11y/alt-text`                     | shadcn-ui |    0 |         0 |           0 |

## 5. Where competitors beat us (theirs-only samples, top 5 each)

Each row is a finding the competitor caught that ours missed. Triage to determine FN-on-our-side vs FP-on-theirs.

### `secure-coding/no-hardcoded-credentials` on vercel-ai — 483 theirs-only finding(s)

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
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.browser.development.js` | 10733 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.browser.production.js`  |  3648 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.node.development.js`    | 10733 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server-legacy.node.production.js`     |  3696 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |
| `packages/next/src/compiled/react-dom-experimental/cjs/react-dom-server.browser.development.js`        | 11392 | React Hook useMemo has a missing dependency: 'callback'. Either include it or remove the dependency array. |

## 6. Where we beat competitors (ours-only samples, top 5 each)

Each row is a finding ours caught that theirs missed. Triage same way — could be a real recall win or our FP.

### `import-next/no-cycle` on next.js — 12 ours-only finding(s)

| File                                                                    | Line | Message                                                                                                                                                                                                                                                                                    |
| :---------------------------------------------------------------------- | ---: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/next/src/client/components/segment-cache/lru.ts`              |    3 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| MEDIUM · Fix: Extract shared types to - export type lruId, schedulerId · - export interface lruSummary, schedulerSummary file \| https://en.wikipedia.org/wiki/Dependency_inversion_principle                    |
| `packages/next/src/client/components/segment-cache/scheduler.ts`        |   49 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| MEDIUM · Fix: Extract shared types to - export type schedulerId, lruId · - export interface schedulerSummary, lruSummary file \| https://en.wikipedia.org/wiki/Dependency_inversion_principle                    |
| `packages/next/src/client/with-router.tsx`                              |    7 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| MEDIUM · Fix: Extract shared types to - export type with-routerId, routerId · - export interface with-routerSummary, routerSummary file \| https://en.wikipedia.org/wiki/Dependency_inversion_principle          |
| `packages/next/src/client/with-router.tsx`                              |    8 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| MEDIUM · Fix: Extract shared types to - export type with-routerId, routerId · - export interface with-routerSummary, routerSummary file \| https://en.wikipedia.org/wiki/Dependency_inversion_principle          |
| `packages/next/src/server/app-render/console-async-storage-instance.ts` |    2 | 🏗️ CWE-407 OWASP:A06-Insecure CVSS:5.3 \| Circular dependency detected \| MEDIUM · Fix: Extract shared types to - export type console-async-storage-instanceId, console-async-storage.externalId · - export interface console-async-storage-instanceSummary, console-async-storage.externa |

### `secure-coding/no-hardcoded-credentials` on vercel-ai — 918 ours-only finding(s)

| File                                      | Line | Message                                                                                                                                                                                                                                                  |
| :---------------------------------------- | ---: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/docs/components/recipes/guides.tsx` |   31 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] · Fix: Use environment variable: process.env.PATH or secret management service \| https://cwe.mitre.org/data/definitions/798.html    |
| `apps/docs/components/recipes/guides.tsx` |   37 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] · Fix: Use environment variable: process.env.PATH or secret management service \| https://cwe.mitre.org/data/definitions/798.html    |
| `apps/docs/lib/example-redirects.ts`      |  702 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] · Fix: Use environment variable: process.env.SOURCE or secret management service \| https://cwe.mitre.org/data/definitions/798.html  |
| `apps/docs/lib/example-redirects.ts`      |  707 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] · Fix: Use environment variable: process.env.SOURCE or secret management service \| https://cwe.mitre.org/data/definitions/798.html  |
| `apps/docs/lib/legacy-redirects.ts`       |   53 | 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] · Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.html |

### `secure-coding/no-redos-vulnerable-regex` on lodash — 1 ours-only finding(s)

| File                    | Line | Message                                                                                                                                                                                                                                              |
| :---------------------- | ---: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/main/build-doc.js` |   65 | 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Nested Repetition: Quantifiers nested within groups with quantifiers \| CRITICAL · Fix: Flatten nested quantifiers \| https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS |

### `react-features/hooks-exhaustive-deps` on next.js — 140 ours-only finding(s)

| File                                           | Line | Message                                                                                                                                                                                                                                                                                  |
| :--------------------------------------------- | ---: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/bundle-analyzer/components/analyzer.tsx` |  221 | ⚠️ React Hook useEffect has unnecessary dependency: selectedRoute \| MEDIUM · Fix: Remove the unnecessary dependency from the array - it never changes or is not used in the effect \| https://react.dev/reference/react/useEffect#removing-unnecessary-dependencies                     |
| `apps/bundle-analyzer/components/analyzer.tsx` |  244 | ⚠️ React Hook useEffect has missing dependencies: e, getRootSourceIndex \| HIGH · Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies                       |
| `apps/bundle-analyzer/components/analyzer.tsx` |  263 | ⚠️ React Hook useMemo has missing dependencies: moduleDepthMap, sourceLoadScopes, assertMatchingModuleIndex, computeActiveEntries, computeModuleDepthMap, computeSourceLoadScopes \| HIGH · Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCall |
| `apps/bundle-analyzer/components/analyzer.tsx` |  292 | ⚠️ React Hook useMemo has missing dependencies: sourceIndex \| HIGH · Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies                                   |
| `apps/bundle-analyzer/components/analyzer.tsx` |  311 | ⚠️ React Hook useMemo has missing dependencies: diffSources, index \| HIGH · Fix: Add missing dependencies to the dependency array or memoize values with useMemo/useCallback \| https://react.dev/reference/react/useEffect#specifying-reactive-dependencies                            |

## 7. Green-field rule samples (no competitor)

### `mongodb-security/no-unsafe-query` on payload — 299 finding(s) (showing top 5)

| File                                                                    | Line | Message                                                                                                                                                                                                                                                                                    |
| :---------------------------------------------------------------------- | ---: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/db-mongodb/src/predefinedMigrations/migrateLocalizeStatus.ts` |  291 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL · Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/predefinedMigrations/migrateLocalizeStatus.ts` |  315 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL · Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/updateGlobal.ts`                               |   40 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL · Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/updateGlobal.ts`                               |   44 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "globalSlug" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL · Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |
| `packages/db-mongodb/src/upsert.ts`                                     |   10 | 🔒 CWE-943 OWASP:A03-Injection CVSS:9.8 \| User input "collection" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication. \| CRITICAL · Fix: Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } } \| ht |

### `browser-security/no-postmessage-wildcard-origin` on next.js — 2 finding(s) (showing top 5)

| File                                                      | Line | Message                                                                                                                                                                                                                                                                                    |
| :-------------------------------------------------------- | ---: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/next/src/compiled/setimmediate/setImmediate.js` |    1 | 🔒 CWE-346 OWASP:A01-Broken CVSS:7.5 \| postMessage with "_" targetOrigin allows any window to receive the message, potentially leaking sensitive data to malicious sites. \| HIGH · Fix: Specify the exact origin of the target window instead of "_". \| https://developer.mozilla.org/e |
| `packages/next/src/compiled/setimmediate/setImmediate.js` |    1 | 🔒 CWE-346 OWASP:A01-Broken CVSS:7.5 \| postMessage with "_" targetOrigin allows any window to receive the message, potentially leaking sensitive data to malicious sites. \| HIGH · Fix: Specify the exact origin of the target window instead of "_". \| https://developer.mozilla.org/e |

### `vercel-ai-security/no-unsafe-output-handling` on vercel-ai — 1 finding(s) (showing top 5)

| File                                       | Line | Message                                                                                                                                                                                                                               |
| :----------------------------------------- | ---: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/ai/src/transcribe/transcribe.ts` |  270 | 🔒 CWE-94 OWASP:A03-Injection CVSS:9.8 \| AI-generated content "{ · startEvent, · execute: async () => { · const result = await retry(async () => { · const callOptions = { · abortSignal, · headers: headersWithUserAgent, · provide |

---

## How to read this

- **Latency** is single-shot. For SLO-grade numbers use median-of-N (TODO: `--repeat=N`).
- **Cold** = `eslint --no-cache`. **Warm** = `eslint --cache --cache-location <stable>` after a prior cold run.
- **oxlint** caches implicitly (file-mtime + content hash). The "warm" column is the second consecutive run.
- **Findings count** is filtered by the rule's own ID prefix; parser errors and other rules are excluded.
- **Synthetic corpus P/R/F1** are the only numbers here that are ground-truthed. Treat OSS findings as evidence for triage, not as P/R numbers.
- **Overlap**: file:line keying. Same line, same file = "both". A theirs-only finding may be a real FN on our side OR a competitor FP — triage required.
