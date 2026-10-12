# FP/FN audit: eslint-plugin-supabase-security (2026-10-12)

The audit ran against the published 0.2.0, which matched `main`. It found 3 false-positive classes and 5 false-negative classes across the 4 rules. All are fixed, and the real-code scan now shows only true positives.

All fixes are local to the plugin. They use devkit helpers this audit added (`followConst`, `readObjectProperty`, `resolveObjectLiteral`, `resolveSdkExport`, `isCredentialShaped`, `createModuleListMatcher`), so **the plugin's 1.0.0 needs the devkit release that ships them**.

**Design constraint.** Verdicts come from AST structure, the scope manager, and bounded same-file value following. The keys the rules read are Supabase's API surface: the `{ data: { user }, error }` response shape, `public`, `supabaseKey`, the `$env/*/public` modules, and the browser factories resolved through their imports. No verdict reads a JS variable name. The service-role check still keys on the **environment variable's** name (`SERVICE_ROLE`), as it did before. That name is the configuration contract Supabase documents, and renaming every identifier in the file does not change it. Each rule has a rename-litmus case.

## Method

- **Synthetic.** 11 snippet files cover:
  - `@supabase/supabase-js` v2 and `@supabase/ssr` (`createBrowserClient`, `createServerClient`);
  - auth-helpers browser factories, `createClient` with anon / service_role / `sb_secret_` / `sb_publishable_` keys;
  - SvelteKit `$env/static/public` and `$env/dynamic/public`, Edge Functions via `npm:`;
  - `auth.getUser` / `getSession` / `getClaims` results that are guarded, returned, chained with `.then()` or trusted unchecked;
  - `.rpc` names that are literals, consts, ternaries, table lookups, literal-union parameters and request fields;
  - `createBucket` / `updateBucket` with options held in consts.
- **Real code.** Every file that imports `@supabase/*`.

| Repository                            | Files   |
| ------------------------------------- | ------- |
| supabase/supabase                     | 913     |
| supabase-community/chatgpt-your-files | 15      |
| vercel/nextjs-subscription-payments   | 8       |
| **Total**                             | **936** |

## Real-code findings per rule

| Rule                          | Published 0.2.0 | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | After the fix | Verdict                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| require-auth-error-check      | 10              | **All FP.** Every one is fail-closed or hands the identity on, never an auth bypass. The guarded ones are `if (!user)` / `if (!session)` / `userData?.user ? … : null`: examples/realtime/nextjs-auth-presence/pages/index.tsx:81, profile.tsx:43; examples/user-management/ionic-angular-user-management/src/app/supabase.service.ts:35; and the six chatgpt-your-files layouts and pages (app/layout.tsx:22, app/page.tsx:9, app/chat/layout.tsx:12, app/chat/page.tsx:77, app/files/layout.tsx:12, app/login/layout.tsx:12). The one that hands it on is `return user` (nextjs-subscription-payments utils/supabase/queries.ts:5). | 0             | —                                                                                                                                                                                                                                                                                                                                                  |
| no-dynamic-rpc-name           | 3               | 2 FP: a ternary between two literal names (supabase packages/ai-commands/src/docs.ts:74); a lookup in a const table of literal names (apps/www/scripts/generate-state-of-startups-data.ts:159). 1 TP: a hook takes `functionName: string` and passes it to `.rpc` (apps/www/components/SurveyResults/SurveyChart.tsx:125). Its callers happen to pass literals, but nothing at the call constrains them. Narrowing the type to a literal union silences it.                                                                                                                                                                           | 1             | TP (SurveyChart.tsx:125)                                                                                                                                                                                                                                                                                                                           |
| no-service-role-key-in-client | 0               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 0             | — (no scanned file leaks it. supabase/supabase does hold `supabase-demo` service-role JWTs, the public local-development keys, in e2e/studio/env.config.ts, which imports no `@supabase/*` package and so was outside the scan. The rule leaves that issuer alone in any case: `the local-development service key every 'supabase start' prints`.) |
| no-public-storage-bucket      | 0               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 0             | —                                                                                                                                                                                                                                                                                                                                                  |

## Findings

| Finding                                                                                                                                                                                    | FP/FN | Status | Test name                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FP-6: a fail-closed auth result reported as CWE-287. Covers the identity guarded, optional-chained, short-circuited, or returned to the caller                                             | FP    | fixed  | `FP: the documented guard on the identity`, `FP: the identity returned to the caller, which decides`, `FP: data.user read in a ternary test`, `FP: a session guard and an optional chain`                                                                                                                                                                |
| FN-7: `.then(({ data }) => …)` was never inspected, and `getClaims()` was not covered                                                                                                      | FN    | fixed  | `FN: a then() callback that tests the container`, `FN: getClaims without its error, the claims unchecked`                                                                                                                                                                                                                                                |
| FP-7: an RPC name the file pins to a closed set reported. Covers a ternary, a const table, an `as const` table (the rule doc's own "known limitation"), and a literal-union parameter      | FP    | fixed  | `FP: a ternary between two literal function names`, `FP: a lookup in a const table of literal names`, `FP: a const name and a template over fixed parts`, `FP: the rule doc's own former known limitation — an as-const allowlist`, `FP: a parameter typed as a union of literal names`, `FP: a parameter typed through a same-file literal-union alias` |
| FN-8: a service-role key given to a browser-only factory (`createBrowserClient`, the auth-helpers browser factories, including their `supabaseKey` option) with no prefix and no directive | FN    | fixed  | `FN: a browser client given service_role, no prefix, no directive`, `FN: the auth-helpers browser factory, the key through a const, renamed`                                                                                                                                                                                                             |
| FN-9: SvelteKit public env carrying the service key (`$env/static/public`, `$env/dynamic/public`)                                                                                          | FN    | fixed  | `FN: SvelteKit public static env carrying the service key`, `FN: SvelteKit public static env, quoted export name`, `FN: SvelteKit public dynamic env carrying the service key`                                                                                                                                                                           |
| FN-10: a service-role key written into source: a JWT with `role: service_role`, or an `sb_secret_` key                                                                                     | FN    | fixed  | `FN: a service_role JWT written into source`, `FN: an sb_secret_ key written into source, even in a server-only module`                                                                                                                                                                                                                                  |
| FN-11: a public bucket whose options or flag are held in a const or a same-file spread                                                                                                     | FN    | fixed  | `FN: the options object held in a const`, `FN: public: true arriving through a same-file spread, the flag in a const`                                                                                                                                                                                                                                    |

What `require-auth-error-check` still reports is the result trusted without its error _or_ a guard:

- the always-truthy `data` container tested (`if (data)`, which is the bypass);
- the identity dereferenced unchecked;
- the result never read.

These are pinned by `the container tested — always truthy, so the failure passes (the bypass)`, `the identity dereferenced with no check`, `data.user dereferenced with no check` and every pre-existing invalid case, all of which still report.

**Test-first.** I ran the new test files against a `git archive HEAD` copy of the sources. 21 of the 22 `FP:`/`FN:` cases failed there. The `.then(({ data }) => data?.user)` case passed on `HEAD`, because the old rule ignored `.then()` entirely. It is renamed `guard: …`.

**Existing tests, registry and corpus.**

- No rule test was moved. Every pre-existing invalid case still reports.
- Case registry ILB-0146 encoded the false positive. Its code was `if (!data.user) throw`, which is fail-closed. It is **retired** with that reason. ILB-0165 (defect: `if (data)`) and ILB-0166 (false-positive: the documented guard, expect silent) replace it.
- Corpus `CWE-287`: both vulnerable fixtures were fail-closed, so they moved to `safe/` as `supabase-auth-identity-guarded.ts` and `supabase-session-handed-to-caller.ts`. The vulnerable fixtures now hold the bypass and the unchecked dereference. `manifest.json` is updated.

## Quint oracle (2026-10-12 follow-up)

`supabase-security.require-auth-error-check` (method × binding × use), `.no-service-role-key-in-client` (key × file × factory × binding), `.no-dynamic-rpc-name` (name × client), `.no-public-storage-bucket` (method × flag × carrier) — 325 cases sampled, every combination of the model's dimensions. Run with `node benchmarks/quint/generate.mjs supabase-security` and `npx vitest run --root benchmarks __tests__/quint-oracle.lock.test.ts`.

| Finding                                                                                                                   | FP/FN | Status | Test name                                                                       |
| ------------------------------------------------------------------------------------------------------------------------- | ----- | ------ | ------------------------------------------------------------------------------- |
| Q-2: `user !== undefined` counted as a guard, though the failure's `null` passes it — 12 model cases                      | FN    | fixed  | `FN: a strict comparison with undefined is passed by the null a failure yields` |
| Q-3: `` `get_stats_v${V}` `` with `const V = 2` reported — a number in a template is as fixed as a string — 3 model cases | FP    | fixed  | `FP: a template over a numeric const`                                           |

## Deferred

None.

## Gates

Run in `packages/eslint-plugin-supabase-security`:

- `npx vitest run --coverage`: green, 100/100/100/100.
- `npm run typecheck`: clean.
- `npm run build`: clean.

Root gates for all four plugins are listed in `2026-10-12-fp-fn-openai-security.md`.
