---
title: require-auth-error-check
description: Read `error` from a Supabase auth result
tags: ['security', 'supabase']
category: security
severity: high
cwe: CWE-287
autofix: false
---

# require-auth-error-check

> Read `error` from a Supabase auth result.

- **CWE:** [CWE-287 — Improper Authentication](https://cwe.mitre.org/data/definitions/287.html)
- **OWASP:** A07:2021 — Identification and Authentication Failures
- **CVSS:** 7.5 (High)
- **Recommended:** `error`

## Why

`supabase.auth.getUser()` does not throw when the token is missing, expired or forged. It resolves:

```ts
{ data: { user: null }, error: AuthApiError }
```

Code that destructures only `data` therefore never sees the failure. Whether that is a hole depends on what it does next. A guard on the identity — `if (!user) redirect('/login')` — is fail-closed: the failure yields `user === null` and takes the "not signed in" branch. That is Supabase's own documented pattern, and the rule does not report it. What is a hole is trusting the result without either check: `data` itself is an object on the failure path too, so `if (data)` lets a failed authentication through, and `user.id` with no check turns an auth failure into an unhandled crash.

## Rule details

Fires only in files importing a `@supabase/*` package. Looks at a destructuring of `.auth.getUser()`, `.auth.getSession()`, `.auth.getClaims()`, `.auth.refreshSession()` or `.auth.exchangeCodeForSession()` — in a declaration, or in the parameter of a `.then()` callback — whose pattern does not bind `error`.

`error`, `error: renamed`, `'error': e` and a rest element all count as bound. A computed key counts as bound too — `const k = 'error'` does bind it, and the node cannot tell that from any other computed key, so the rule abstains rather than flag correct code.

It then stays silent when the result is handled fail-closed: when the identity (`user`, `session` or `claims`, bound directly or read as `data.user`) is checked — a branch test, a short-circuit, an optional chain — or handed on. A strict comparison with `undefined` (`user !== undefined`) is not a check: the failure path yields `null`, which passes it (returned, passed, stored), so a caller decides. It reports the result trusted without either: the always-truthy `data` tested, the identity dereferenced unchecked, or the result never read.

## Incorrect

```ts
import { createClient } from '@supabase/supabase-js';

const { data } = await supabase.auth.getUser();
if (data) return renderDashboard(); // `data` is { user: null } on failure — always truthy
```

```ts
const {
  data: { user },
} = await supabase.auth.getUser();
await supabase.from('notes').delete().eq('owner', user.id); // no check at all
```

## Correct

```ts
import { createClient } from '@supabase/supabase-js';

const { data, error } = await supabase.auth.getUser();
if (error) throw error;
if (!data.user) redirect('/login');
```

## Further reading

- [Supabase — `getUser()`](https://supabase.com/docs/reference/javascript/auth-getuser)
