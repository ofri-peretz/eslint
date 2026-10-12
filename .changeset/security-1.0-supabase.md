---
'eslint-plugin-supabase-security': major
---

feat(supabase-security)!: 1.0.0, stable Supabase security rules checked against real code

1.0 declares the rule set, the rule names, the options and the presets stable. Every rule went through a false-positive/false-negative review against the published 0.x release. That review covered realistic snippets, a scan of real open-source code that uses the library, and a Quint model of each main rule's contract (`benchmarks/quint/`). Every finding was fixed test-first, and nothing was deferred.

Fail-closed auth handling (the identity guarded, optional-chained, short-circuited or returned) and RPC names chosen from a closed set are no longer reported. `createBrowserClient` and the auth-helpers browser factories, SvelteKit public env, hardcoded `service_role` keys, `.then` chains, and public buckets configured through a const or spread are now checked.

Full audit: `benchmarks/audits/2026-10-12-fp-fn-supabase-security.md`.

## Migration

No configuration change is needed. Rule names, options and presets are unchanged:

```js
import plugin from 'eslint-plugin-supabase-security';

export default [plugin.configs.recommended];
```

The fixed false negatives can report code that 0.x missed. Treat a new finding as a real issue, or suppress a single deliberate case with `// eslint-disable-next-line`.
