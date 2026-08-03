---
title: no-permissive-cors
description: This rule detects CORS configured to reflect any origin while allowing credentials, which lets any website call ...
tags: ['security', 'nestjs']
category: security
severity: high
cwe: CWE-942
owasp: 'A05:2021'
autofix: false
---

> Detect CORS reflecting any origin while allowing credentials

<!-- @rule-summary -->

This rule detects CORS configured to reflect any origin while allowing credentials, which lets any website call ...
<!-- @/rule-summary -->

## Rule Details

`origin: '*'` on its own is **not** a vulnerability. Browsers refuse to send
cookies to a wildcard origin, which is exactly why a public read-only API can
set it safely.

The dangerous configuration is a wildcard or reflected origin _combined with_
`credentials: true`. Then every site the victim visits can call the API with the
victim's session cookie and read the response — the browser's same-origin
protection has been switched off by the server.

This rule reports only that pairing, and only when both values are literals.
That is what makes it a zero-false-positive rule rather than a noisy one.

## OWASP Mapping

- **OWASP Top 10 2021**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-942 - Permissive Cross-domain Policy with Untrusted Domains
- **CVSS**: 8.1 (High)

## ❌ Incorrect

```typescript
// `origin: true` reflects whatever Origin header arrived.
export const corsOptions: CorsOptions = {
  origin: true,
  credentials: true,
};

app.enableCors({ origin: '*', credentials: true });

const app = await NestFactory.create(AppModule, {
  cors: { origin: ['*'], credentials: true },
});
```

## ✅ Correct

```typescript
// An explicit allow-list.
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') ?? ['https://app.example.com'],
  credentials: true,
});

// A wildcard with no credentials: a public API, not a vulnerability.
app.enableCors({ origin: '*', methods: ['GET'] });

// A validating callback — the documented pattern, never reported.
app.enableCors({
  origin: (origin, callback) => callback(null, allowed.includes(origin)),
  credentials: true,
});
```

## Options

```typescript
{
  // Skip rule in test files (default: true)
  allowInTests?: boolean;
}
```

## How the options object is recognized

Any object literal carrying **both** `origin` and `credentials` is CORS options
— that pair does not occur together on anything else in a Nest application.
Matching the object rather than the call site catches the common indirection of
declaring `const corsOptions: CorsOptions = {…}` in one file and passing it to
`enableCors` in another, which is how the one real-world instance in the
measured corpus is written.

## When Not To Use It

- If the API is genuinely public _and_ the credentials flag is required for a
  non-cookie scheme you control end to end. That is rare; prefer an allow-list.

## Known False Negatives

### Values assembled at runtime

**Why**: Only literal `true` / `'*'` / `['*']` origins are reported, so nothing
is asserted about a computed value.

```typescript
// ❌ NOT DETECTED - origin is a variable
const corsOptions = { origin: allowAll ? '*' : whitelist, credentials: true };
```

### Reflect-everything callbacks

**Why**: A function `origin` is the documented way to validate against an
allow-list. Flagging it would punish the correct pattern, so a callback is never
reported — even one that always calls back `true`.

```typescript
// ❌ NOT DETECTED (deliberately) - indistinguishable from a real validator
app.enableCors({ origin: (o, cb) => cb(null, true), credentials: true });
```

**Mitigation**: Review origin callbacks by hand; they are few.

### CORS applied by middleware

**Why**: `app.use(cors({...}))` from the Express package is not the Nest shape,
and belongs to `eslint-plugin-express-security`.
