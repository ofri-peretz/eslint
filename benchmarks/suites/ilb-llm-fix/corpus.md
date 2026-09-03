# `ilb-llm-fix` — Corpus Citations

> Source provenance for every fixture in [`fixtures.json`](./fixtures.json).
> See [`methodology.md`](./methodology.md) §Fixture sourcing rule (v1.1)
> for why every fixture must cite an OSS source.

**Corpus version:** v1.3
**OSS root:** `~/repos/ofriperetz.dev/oos/`

## Citation table

| Fixture | Category | OSS repo | File / location | Provenance shape |
| --- | --- | --- | --- | --- |
| `jwt-missing-algorithms` | security | [`nestjs`](https://github.com/nestjs/nest) | [`sample/19-auth-jwt/src/auth/auth.guard.ts`](https://github.com/nestjs/nest/blob/master/sample/19-auth-jwt/src/auth/auth.guard.ts) | Verbatim extract — the official NestJS JWT auth sample passes only `{ secret }` to `verifyAsync`, omitting the `algorithms` whitelist. The buggy snippet mirrors `auth.guard.ts` lines 36–38. |
| `xss-innerhtml-three` | security | [`three.js`](https://github.com/mrdoob/three.js) | [`examples/index.html`](https://github.com/mrdoob/three.js/blob/master/examples/index.html) | Adapted — Three.js's `examples/index.html` uses `div.innerHTML = htmlString.trim()` for filter results. The fixture adapts that to a `userQuery` variant where the input is user-controlled (the genuine CWE-79 case). |
| `react-dangerously-set-inner-html-user-input` | security | [`shadcn-ui`](https://github.com/shadcn-ui/ui) | [`apps/v4/app/layout.tsx`](https://github.com/shadcn-ui/ui/blob/main/apps/v4/app/layout.tsx) | Adapted — shadcn-ui legitimately uses `dangerouslySetInnerHTML` to inject a static theme-detection script before hydration (safe). The fixture adapts the pattern to a hypothetical user-input variant (`userBio`) — the lint rule should still flag it. |
| `weak-md5-content-hash` | security | [`medusa`](https://github.com/medusajs/medusa) | [`packages/admin/admin-vite-plugin/src/utils.ts`](https://github.com/medusajs/medusa/blob/develop/packages/admin/admin-vite-plugin/src/utils.ts#L175-L177) | Verbatim extract — Medusa's admin Vite plugin uses MD5 for non-cryptographic content fingerprinting (cache key generation). v1.2 verifier accepts both fix paths: switch to SHA-256 OR keep MD5 with an explicit non-cryptographic comment. |
| `timing-attack-credential-compare` | security | [`cal.com`](https://github.com/calcom/cal.com) | [`apps/api/v2/src/platform/calendars/services/apple-calendar.service.ts:82`](https://github.com/calcom/cal.com/blob/main/apps/api/v2/src/platform/calendars/services/apple-calendar.service.ts#L82) | Verbatim extract — Cal.com's Apple Calendar credential check uses `decryptedKey.password === password` (line 82), a textbook CWE-208 timing-attack vector. Verifier requires `crypto.timingSafeEqual`. _New in v1.2._ |
| `circular-dependency-cross-module` | quality | _multiple_ | (pattern present across [`payload`](https://github.com/payloadcms/payload), [`medusa`](https://github.com/medusajs/medusa), [`strapi`](https://github.com/strapi/strapi), [`twentyhq`](https://github.com/twentyhq/twenty)) | Generic — circular imports between two domain modules sharing a type are a universal TS server pattern. No single oos/ repo cited; the fixture targets the shape, not a specific instance. |
| `barrel-file-deep-import` | quality | [`payload`](https://github.com/payloadcms/payload) | [`packages/payload/src/index.ts`](https://github.com/payloadcms/payload/blob/main/packages/payload/src/index.ts) | Verbatim extract — Payload's main package barrel is 1893 lines as of 2026-05-03. Importing a single helper through the barrel drags in the whole transitive dep graph. _New in v1.2._ |
| `n-plus-one-orm-iteration` | performance | _multiple_ | (pattern common in [`payload`](https://github.com/payloadcms/payload), [`medusa`](https://github.com/medusajs/medusa), [`strapi`](https://github.com/strapi/strapi), [`twentyhq`](https://github.com/twentyhq/twenty)) | Generic — `for` loop with per-row `await db.findUnique(...)` is the textbook N+1 across all the oos/ ORM-backed services. The fixture targets the shape. |
| `hardcoded-jwt-secret` | security | [`nestjs`](https://github.com/nestjs/nest) | [`sample/19-auth-jwt/src/auth/constants.ts`](https://github.com/nestjs/nest/blob/master/sample/19-auth-jwt/src/auth/constants.ts) | Verbatim extract — NestJS's official JWT auth sample exports `jwtConstants.secret` as a hardcoded string. The string self-deprecates ("DO NOT USE THIS VALUE...") but the pattern is the textbook CWE-798 anti-pattern any project copying the sample inherits. _New in v1.3._ |
| `eval-on-dynamic-import` | security | [`payload`](https://github.com/payloadcms/payload) | [`packages/payload/src/utilities/dynamicImport.ts:27`](https://github.com/payloadcms/payload/blob/main/packages/payload/src/utilities/dynamicImport.ts#L27) | Verbatim extract — Payload wraps a string-interpolated `import()` in `eval()` to dodge Next.js bundler analysis. The comment is explicit. The same shape in any user-input-touching code path is a CWE-95 vector. _New in v1.3._ |
| `foreach-async-floating-promise` | quality | _multiple_ | (pattern in [`strapi/.../EditConfigurationPage.test.tsx:72`](https://github.com/strapi/strapi/blob/main/packages/core/content-manager/admin/src/pages/tests/EditConfigurationPage.test.tsx#L72), and generally across all the oos/ TS codebases) | Generic — `Array.forEach(async ...)` floats promises silently. Not unique to one repo, but the strapi instance is the verbatim shape. _New in v1.3._ |
| `insecure-random-api-key` | security | [`cal.com`](https://github.com/calcom/cal.com) | [`apps/web/components/apps/make/Setup.tsx:38`](https://github.com/calcom/cal.com/blob/main/apps/web/components/apps/make/Setup.tsx#L38) | Verbatim extract — Cal.com's Make integration setup builds an API key with `Math.random().toString(36).substring(2)`. Math.random() is non-cryptographic and the key is predictable from a few observations. CWE-330. _New in v1.3._ |

## How to add a new fixture

1. Pick a real pattern from one of the oos/ repos (or — for category 6 generic patterns — confirm the pattern is present across ≥ 3 oos/ repos).
2. Add the entry to `fixtures.json` with a `source` block per the methodology v1.1 shape.
3. Add the row to this table with the file URL and provenance shape (verbatim / adapted / generic).
4. Bump `fixtures.json` `version` to the next minor (`v1.1` → `v1.2`) and update `methodology.md` accordingly.
5. Re-run `npm run ilb:llm:fix` and commit the updated `latest.json`.

## Out of scope

- We do not pull bug-fix commit pairs (pre-fix → post-fix) from oos/ git history. That would be a stronger signal but requires per-repo archaeology and accurate CVE/PR citation. A future `ilb-llm-fix v2.0` may add this as a third provenance shape (`historical-fix`).
- We do not synthesize buggy code from CVE/GHSA descriptions alone. Every fixture must be grounded in an extant or adaptable OSS file.
- Fixtures from private repos (e.g. snappy-client-dashboard) are explicitly disallowed — see methodology v1.1.
