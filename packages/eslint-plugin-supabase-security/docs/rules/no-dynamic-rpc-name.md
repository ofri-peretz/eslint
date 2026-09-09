---
title: no-dynamic-rpc-name
description: Call `.rpc()` with a literal function name
tags: ['security', 'supabase']
category: security
severity: high
cwe: CWE-913
autofix: false
---

# no-dynamic-rpc-name

> Call `.rpc()` with a literal function name.

- **CWE:** [CWE-913 — Improper Control of Dynamically-Managed Code Resources](https://cwe.mitre.org/data/definitions/913.html)
- **OWASP:** A03:2021 — Injection
- **CVSS:** 8.1 (High)
- **Recommended:** `error`

## Why

`supabase.rpc(name, args)` executes a Postgres function by name over PostgREST. When the name is computed, the caller chooses which function runs — and a Supabase project's exposed schema routinely holds privileged helpers next to the intended one: `delete_user`, `grant_admin`, `reset_password`.

This is the same shape as a dynamic `require()`: the danger is not the arguments, it is that the _callee_ is data.

## Rule details

Fires only in files importing a `@supabase/*` package. Reports `.rpc(x)` where `x` is not a fixed string.

A template literal with no interpolation is a fixed string — `` `get_profile` `` is exactly as fixed as `'get_profile'` — and is not reported. A spread is unreadable from the call site and is left alone.

## Incorrect

```ts
import { createClient } from '@supabase/supabase-js';

await db.rpc(req.body.fn, args);
await db.rpc(`get_${kind}`, args);
```

## Correct

```ts
import { createClient } from '@supabase/supabase-js';

await db.rpc('get_user_profile', { id });

// Or map through an allowlist, so an unknown key is an error rather than a call.
const FN = { profile: 'get_user_profile', orders: 'get_user_orders' } as const;
const fn = FN[kind];
if (!fn) throw new Error('unknown query');
await db.rpc(fn, { id });
```

## Further reading

- [Supabase — `rpc()`](https://supabase.com/docs/reference/javascript/rpc)
