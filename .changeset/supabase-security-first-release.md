---
'eslint-plugin-supabase-security': minor
'@interlace/eslint-devkit': patch
---

**✨ New** — `eslint-plugin-supabase-security`, four rules for the Supabase client.

`no-service-role-key-in-client` is why the package exists: `service_role` bypasses Row Level Security completely, and the line that leaks it into a browser bundle is indistinguishable from every other `createClient` call. It reports a service-role variable behind a public env prefix (`NEXT_PUBLIC_`, `VITE_`, …) and one read inside a `'use client'` module, and abstains where the file imports `server-only`.

Alongside it: `no-dynamic-rpc-name` (a computed `.rpc()` name lets the caller pick which Postgres function runs), `require-auth-error-check` (`getUser()` reports a forged token by returning `error`, not by throwing, so destructuring only `data` reads a failure as an anonymous success), and `no-public-storage-bucket` (`strict` only — a public bucket is sometimes intended).

Every rule gates on a `@supabase/*` import, because `.rpc()`, `.auth` and `createBucket()` are ordinary member names.

The devkit registers `plugin-supabase-security` in `PLUGIN_DOCS_CATEGORY`. Without it every rule in the new plugin ships with no `meta.docs.url`, which is a "see docs" link that 404s in every IDE, CI report and SARIF file — the devkit warns about the gap at build time rather than guessing a category.
