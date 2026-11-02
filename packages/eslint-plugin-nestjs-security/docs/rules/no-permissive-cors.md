---
title: no-permissive-cors
description: Flags CORS configured to accept any origin — a bare enableCors(), origin '*', or the reflecting origin true.
tags: ['security', 'nestjs']
category: security
severity: high
cwe: CWE-942
owasp: 'A05:2021'
autofix: false
---

> Disallows CORS configured to accept any origin

<!-- @rule-summary -->

Flags CORS configured to accept any origin — a bare `enableCors()`, `origin: '*'`, or the reflecting `origin: true`.
<!-- @/rule-summary -->

## Rule Details

Three shapes all accept every origin, and only one of them looks obviously wrong:

```ts
app.enableCors(); // no options → origin defaults to '*'
app.enableCors({ origin: '*' }); // explicit wildcard
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

- an `origin` that is a variable, member expression, template literal with
  something interpolated, array, regex, or callback (`` `*` `` with nothing
  interpolated is the string `'*'` and is reported)
- an options object imported from another module — `enableCors(corsOptions)`
  only reports when `corsOptions` is declared in the same file
- an options object with a spread (`{ ...base }`) and no visible `origin`, since
  the spread may supply it
- a variable that is **reassigned** after its declaration. The value at the call
  site may not be the value at the declaration, so only a binding written exactly
  once — its initialiser — is read.

## Environment checks

A permissive call that can only run outside production is not reported. A
branch counts when **both** hold:

1. its condition mentions one of `environmentHintNames` as a whole identifier
   or word (`NODE_ENV`, `isDev`, `'development'`, …); and
2. read in the branch's direction, the condition selects a development
   environment. A condition naming `production` / `prod` / `isProd` selects
   production, or development when negated (`!==`, `!=`, a leading `!`); one
   naming `development` / `dev` / `test` / `local` / `staging` / `isDev` /
   `devMode` selects development, or production when negated.

The `if` / `?:` consequent and the right of `&&` run when the condition is
true; the `else` / `:` alternate and the right of `||` run when it is false.

```ts
if (process.env.NODE_ENV !== 'production') app.enableCors({ origin: '*' }); // not reported
isDev && app.enableCors({ origin: true }); // not reported
if (process.env.NODE_ENV === 'production') {
} else {
  app.enableCors({ origin: '*' }); // not reported: runs outside production
}
if (process.env.NODE_ENV === 'development') {
} else {
  app.enableCors({ origin: '*' }); // reported: this branch is production
}
if (req.path.startsWith('/public')) app.enableCors({ origin: '*' }); // reported: not about the environment
```

`environmentHintNames` **replaces** the default list. A project whose flag is
`stage` sets `['stage']`, after which `if (stage === 'local')` counts — and
`NODE_ENV` no longer does unless it is listed too.

The call is `enableCors` on any receiver however the member is spelled:
`app.enableCors(…)` and `app['enableCors'](…)` are the same call.

## Options

| Option                 | Type       | Default                                                                                                                                        | Description                                                                |
| ---------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `allowInTests`         | `boolean`  | `true`                                                                                                                                         | Skip this rule in `*.test.*` / `*.spec.*` files                            |
| `environmentHintNames` | `string[]` | `["NODE_ENV","APP_ENV","ENVIRONMENT","isDev","isDevelopment","isLocal","isTest","isProd","isProduction","devMode","development","production"]` | Words that mark a condition as an environment check. Replaces the default. |

```ts
'nestjs-security/no-permissive-cors': ['error', { allowInTests: true }]
```

| Option         | Type      | Default | Description                                      |
| -------------- | --------- | ------- | ------------------------------------------------ |
| `allowInTests` | `boolean` | `true`  | Skip `*.spec.ts` / `*.test.ts` / `*.e2e-spec.ts` |

## When Not To Use It

If the service is a genuinely public, unauthenticated, read-only API where any
origin reading responses is intended. Even then, prefer `origin: '*'` written
explicitly over a bare `enableCors()`, so the intent is visible to the next
reader.

## Further Reading

- [CWE-942: Permissive Cross-domain Policy with Untrusted Domains](https://cwe.mitre.org/data/definitions/942.html)
- [NestJS — CORS](https://docs.nestjs.com/security/cors)
