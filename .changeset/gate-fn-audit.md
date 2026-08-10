---
'eslint-plugin-express-security': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-postgresql-security': patch
'eslint-plugin-vercel-ai-security': patch
---

Close two false-negative classes across every SDK-evidence gate

A full false-negative audit ran every gated plugin twice over the 107-repository
corpus — once with the gates forced open, once as shipped — and compared the
**6,686 findings the gates silence across 5,235 files**. Of those files, 134 were
flagged as suspect (the SDK *is* imported but the gate closed anyway), and two
real defect classes came out of verifying them one by one.

**1. TypeScript's import-equals form was invisible to four of the five gates.**
`import express = require('express')` is a `TSImportEqualsDeclaration` whose
module reference is a `TSExternalModuleReference` — not a `require`
`CallExpression` — so the dynamic-load arm never saw it. **82 corpus files
written this way for Express alone had every rule in the plugin silenced.** Only
`mongodb-security` handled it, and only because an earlier audit forced the
issue. Now handled by express, lambda, postgresql and vercel-ai too.

**2. Deno's module specifiers were unrecognisable to all five.**
`npm:@aws-sdk/client-bedrock-runtime` and
`https://deno.land/x/postgres@v0.17.0/mod.ts` are ordinary SDK imports in Deno
and Supabase Edge Functions; the prefix made the specifier unmatchable and the
whole plugin abstained on real SDK code. Both forms are now normalised before
the package test.

**`postgresql-security` also had no dynamic `import()` arm at all** — alone
among the five — so a file that lazily loads its driver was silenced entirely.
Every other gate has carried that arm since #481.

**Measured, not assumed.** Re-sweeping the same 119,271 files with the fixes:
**198 findings recovered across 88 files** (196 express, 1 postgres, 1 lambda)
and **zero regressions** — nothing that reported before is silenced now.

The two non-Express recoveries are the clearest illustration of what was broken:
`no-missing-authorization-check` on a Supabase Edge Function calling Bedrock, and
`no-missing-client-release` on a Deno postgres pool driver. Both are real
serverless code that the ecosystem was blind to.

Verification also **ruled out** four groups the generous probe flagged, rather
than widening the gates to swallow them: `@serverless/*` and
`@aws-lambda-powertools/*` hits were the frameworks' own source (one specifier
was inside a JSDoc `@example` block), and `@payloadcms/db-mongodb` /
`@medusajs/deps/pg` were type-only imports of adapter packages in files that
never touch the driver.

Each new arm ships a positive control in the plugin's `module-gate.lock.test.ts`
— import-equals, `npm:`, and `deno.land/x` for every gate, plus the dynamic
`import()` case for postgres — so none of them can regress silently. All four
packages remain at 100% statements / branches / functions / lines.
