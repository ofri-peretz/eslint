---
title: no-permissive-cors
description: Flags CORS configured to accept any origin — a bare enableCors(), origin '*', or the reflecting origin true.
tags: ['security', 'nestjs']
category: security
severity: high
cwe: CWE-942
owasp: "A05:2021"
autofix: false
---

> Disallows CORS configured to accept any origin

<!-- @rule-summary -->
Flags CORS configured to accept any origin — a bare `enableCors()`, `origin: '*'`, or the reflecting `origin: true`.
<!-- @/rule-summary -->

## Rule Details

Three shapes all accept every origin, and only one of them looks obviously wrong:

```ts
app.enableCors();                 // no options → origin defaults to '*'
app.enableCors({ origin: '*' });  // explicit wildcard
app.enableCors({ origin: true }); // reflects whatever Origin was sent
```

`origin: true` is the one worth understanding. It does not mean "CORS on" — it
echoes the request's own `Origin` header straight back in
`Access-Control-Allow-Origin`, so every site passes the check. Unlike `'*'`, it
also stays valid alongside `credentials: true`, and browsers **will** send
cookies on those requests. That combination lets any page your user visits read
authenticated responses from your API.

Measured on five real NestJS applications, both CORS call sites present were
permissive: one bare `enableCors()` and one `enableCors({ origin: true })`.

## ❌ Incorrect

```ts
app.enableCors();

app.enableCors({ credentials: true }); // no origin key → default '*' applies

app.enableCors({ origin: '*' });

app.enableCors({ origin: true, credentials: true });
```

## ✅ Correct

```ts
app.enableCors({ origin: ['https://app.example.com'] });

app.enableCors({ origin: 'https://app.example.com' });

app.enableCors({ origin: false }); // CORS explicitly off

// Resolved at runtime — the rule does not guess at these
app.enableCors({ origin: configService.get('cors.origin') });
app.enableCors({ origin: (o, cb) => cb(null, allowed.includes(o)) });
```

## What this rule deliberately does not report

A security rule that guesses earns a reputation for noise, so anything not
statically decidable is left alone:

- an `origin` that is a variable, member expression, template literal, array,
  regex, or callback
- an options object imported from another module — `enableCors(corsOptions)`
  only reports when `corsOptions` is declared in the same file
- an options object with a spread (`{ ...base }`) and no visible `origin`, since
  the spread may supply it

## Options

```ts
'nestjs-security/no-permissive-cors': ['error', { allowInTests: true }]
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allowInTests` | `boolean` | `true` | Skip `*.spec.ts` / `*.test.ts` / `*.e2e-spec.ts` |

## When Not To Use It

If the service is a genuinely public, unauthenticated, read-only API where any
origin reading responses is intended. Even then, prefer `origin: '*'` written
explicitly over a bare `enableCors()`, so the intent is visible to the next
reader.

## Further Reading

- [CWE-942: Permissive Cross-domain Policy with Untrusted Domains](https://cwe.mitre.org/data/definitions/942.html)
- [NestJS — CORS](https://docs.nestjs.com/security/cors)
