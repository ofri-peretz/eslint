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

Code that destructures only `data` therefore reads an authentication _failure_ as an anonymous request. That is fine when the next line is a login prompt and wrong when it is an authorisation decision — and the failure is silent either way, because `user` is `null` on both paths. Any `if (!user) redirect('/login')` guard downstream cannot tell "no session" from "the auth service errored".

## Rule details

Fires only in files importing a `@supabase/*` package. Reports a destructuring declaration whose initialiser is a call to `.auth.getUser()`, `.auth.getSession()`, `.auth.refreshSession()` or `.auth.exchangeCodeForSession()` and whose pattern does not bind `error`.

`error`, `error: renamed`, `'error': e` and a rest element all count as bound. A computed key counts as bound too — `const k = 'error'` does bind it, and the node cannot tell that from any other computed key, so the rule abstains rather than flag correct code.

A `.then()` chain is not reported: the result is not destructured at the declarator, so there is no omission to read.

## Incorrect

```ts
import { createClient } from '@supabase/supabase-js';

const { data } = await supabase.auth.getUser();
if (!data.user) redirect('/login'); // an auth outage takes this branch too
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
