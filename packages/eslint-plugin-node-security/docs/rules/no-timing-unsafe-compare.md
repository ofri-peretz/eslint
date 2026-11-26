---
title: no-timing-unsafe-compare
description: Disallow timing-unsafe comparison of secrets
tags: ['security', 'timing-attack', 'cwe-208', 'nodejs']
category: security
severity: medium
cwe: CWE-208
owasp: 'A02:2021'
autofix: false
---

> **Keywords:** timing attack, constant-time, timingSafeEqual, secret comparison, CWE-208, security, ESLint rule
> **CWE:** [CWE-208](https://cwe.mitre.org/data/definitions/208.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

<!-- @rule-summary -->

Disallow timing-unsafe comparison of secrets
<!-- @/rule-summary -->

Detects timing-unsafe comparison of secrets using `===` or `==` operators. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-208](https://cwe.mitre.org/data/definitions/208.html) (Timing Attack) |
| **Severity**      | High (security vulnerability)                                              |
| **Auto-Fix**      | 💡 Suggests crypto.timingSafeEqual()                                       |
| **Category**      | Security                                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | Node.js applications comparing tokens, secrets, or signatures              |

## Vulnerability and Risk

**Vulnerability:** Using `===` to compare secrets enables timing attacks. The comparison short-circuits on the first mismatched character, so the time taken reveals information about how many characters matched.

**Risk:** An attacker can measure comparison times to guess secret values character-by-character. For example, comparing API keys or HMAC signatures with `===` allows attackers to brute-force the correct value.

## Rule Details

This rule detects `===`, `==`, `!==`, and `!=` comparisons of a secret against a value an attacker controls. Both halves are required by default:

- one operand reads off a request (`req`, `request`, `ctx`, `event` — see `untrustedSources`), and
- the other has a name suggesting it is a secret (`token`, `secret`, `password`, `hash`, `signature`, … — see `secretPatterns`).

A secret pattern shorter than six letters (`token`, `auth`, `hash`, `jwt`, `mac`, …) matches only as a whole word of the identifier, on camelCase, acronym and separator boundaries: `accessToken`, `x_auth_token` and `JWTValue` match, `maxTokens`, `author` and `hashtag` do not. A longer pattern matches anywhere (`clientsecret`, `hashedpassword`). `authorization` is its own default pattern for that reason. A pattern with regex syntax in it keeps the substring semantics its author wrote.

A value the server holds compared with another value the server holds (`req.session.csrfSecret` against a memo of itself, an element of `req.user.sessions` against the current session's id) has no attacker on either side and is not reported.

A configured secret is the exception to the request requirement: `process.env.API_SECRET`, a variable aliasing it, or a secret-named property of an imported `config`/`conf`/`settings`/`secrets` object, compared with a parameter, a secret-named value or a field a constructor filled from a parameter, is reported with no request in sight. Two configured values compared with each other are not.

Two secret-named values with no request operand (`submittedToken === validToken`) are not reported: nothing shows an attacker can time the comparison. `reportUnverifiedComparisons: true` reports on the secret-looking name alone.

The same comparison through a helper counts too: `buf.equals(other)`, `Buffer.compare(a, b)`, `_.isEqual(a, b)` and its siblings — whose first two arguments are the values even when a customizer or options bag follows (`_.isEqualWith(a, b, fn)`, `deepEqual(a, b, { strict: true })`) — and a local wrapper that compares two of its parameters. A crypto derivation (`createHmac(…).digest()`, a `.sign()` or `#hmac()` method) is a secret by shape whatever it is named, and so is a value read from `req.session`/`req.user`/`await`, however many aliases away. A value compared with itself or a reading of itself (`token !== token.trim()`, `token !== token`) is one value, and is not reported.

## Why This Matters

| Risk                      | Impact                               | Solution                     |
| ------------------------- | ------------------------------------ | ---------------------------- |
| ⏱️ **Timing Leak**        | Comparison time reveals match length | Use crypto.timingSafeEqual() |
| 🔑 **Secret Brute Force** | Attack one character at a time       | Constant-time comparison     |
| 🔒 **Token Bypass**       | Forge tokens by timing analysis      | Never use === for secrets    |

## Configuration

The options and their defaults are listed under [⚙️ Options](#-options) below.

```javascript
{
  rules: {
    'node-security/no-timing-unsafe-compare': ['error', {
      // also report a secret-named comparison with no request operand
      reportUnverifiedComparisons: true,
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
// A request header compared to a stored API key - HIGH risk
function check(req) {
  return req.headers['x-api-key'] === process.env.API_SECRET; // ❌ Leaks timing information
}

// A request token compared with ===
if (req.body.token === validToken) {
  // ❌ Vulnerable
  grantAccess();
}

// HMAC verification with ===
const expectedHash = crypto
  .createHmac('sha256', secret)
  .update(data)
  .digest('hex');
if (req.headers['x-signature'] === expectedHash) {
  // ❌ Timing attack possible
  processData();
}

// With reportUnverifiedComparisons: true, the names alone are enough
if (submittedToken === validToken) {
  // ❌ only under reportUnverifiedComparisons
}
```

### ✅ Correct

```typescript
import crypto from 'crypto';

// Constant-time comparison
function validateApiKey(userKey: string, storedKey: string) {
  const userBuffer = Buffer.from(userKey);
  const storedBuffer = Buffer.from(storedKey);

  // Lengths must match for timingSafeEqual
  if (userBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(userBuffer, storedBuffer); // ✅ Safe
}

// HMAC verification (constant-time)
function verifyHmac(data: Buffer, receivedHmac: Buffer, secret: Buffer) {
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest();

  if (receivedHmac.length !== expectedHmac.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedHmac, expectedHmac); // ✅ Safe
}

// JWT verification (use library)
import jwt from 'jsonwebtoken';
jwt.verify(token, secret); // ✅ Library handles timing-safe comparison
```

## How Timing Attacks Work

```
Secret:   "s3cr3t_k3y"
Guess 1:  "aaaaaaaaaa" → Fast rejection (0 chars match)
Guess 2:  "saaaaaaaaa" → Slightly slower (1 char matches)
Guess 3:  "s3aaaaaaaa" → Even slower (2 chars match)
...
Guess N:  "s3cr3t_k3y" → Slowest (all chars match)
```

Each additional matching character adds measurable time, allowing attackers to discover secrets character-by-character.

## Security Impact

| Vulnerability      | CWE | OWASP    | CVSS       | Impact                 |
| ------------------ | --- | -------- | ---------- | ---------------------- |
| Timing Discrepancy | 208 | A02:2021 | 5.9 Medium | Secret value leak      |
| Observable Timing  | 208 | A02:2021 | 5.3 Medium | Brute force enablement |

## Migration Guide

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-timing-unsafe-compare': 'warn'
  }
}
```

### Phase 2: Replacement

```javascript
// Replace === with timingSafeEqual
if (req.body.token === validToken)  // ❌ Before
if (crypto.timingSafeEqual(Buffer.from(req.body.token), Buffer.from(validToken)))  // ✅ After
```

### Phase 3: Enforcement

```javascript
{
  rules: {
    'node-security/no-timing-unsafe-compare': 'error'
  }
}
```

## Not a finding

An imported binding is a module's export, never the request being served. NestJS compares a
provider's DI token with the imported `REQUEST` token, and the name alone made it read as the
request object:

```ts
import { REQUEST } from '@nestjs/core';
if (token === REQUEST) { ... }  // not request data
```

A local or a parameter that holds the request under the same name still reports.

An imported name that is a literal where it is declared is a constant. The rule follows the
import across relative files and reads the declaration; an export written as `process.env.X`
or a call is not a constant and still reports:

```ts
// events/index.ts: export const API_TOKEN_DELETED = 'api-token-deleted';
import { API_TOKEN_DELETED } from '../events';
if (event.type === API_TOKEN_DELETED) { ... }  // not a secret
```

The same holds for a property of an imported object of literals, such as `req.path === ROUTES.resetPassword`
with `export const ROUTES = { resetPassword: '/reset-password' }`. A property written as an env
read still reports, and so does any property of an object its module writes to again
(`KEYS.api = process.env.KEY`, `Object.assign(KEYS, …)`, `delete KEYS.api`): the literal was a
placeholder.

A plain digest (`createHash`) of what the caller sent is a value the caller can compute too, so
comparing it with a digest the client supplied leaks nothing. A digest that also takes something
the caller did not send, or any keyed derivation (`createHmac`), is still a secret. So is an input
that joins the request with a server value (`req.body + pepper`), also when a binding holds the
join (`const payload = req.body + pepper`) or a call other than `JSON.stringify`, `String`,
`Buffer.from`, `encodeURIComponent` or a method of the request value wraps it, and a chain with a call other
than `digest`, `toString`, `toLowerCase` or `toUpperCase` (`.concat(secret)`). The encoding
argument of `.update(data, 'utf8')` is not an input:

```ts
const computed = createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
if (computed !== req.headers['content-sha256']) { ... }  // integrity check, not a secret
```

## Related Rules

- [`no-hardcoded-credentials`](../secure-coding/no-hardcoded-credentials.md) - Detect hardcoded secrets
- [`no-weak-hash-algorithm`](./no-weak-hash-algorithm.md) - Detect weak hash algorithms

## Known False Negatives

### Non-Standard Variable Names

**Why**: Only configured patterns are detected.

```typescript
// ❌ NOT DETECTED - unusual variable name
if (userValue === dbValue) { ... }  // Actually comparing tokens
```

**Mitigation**: Add patterns to configuration or use consistent naming.

### Indirect Comparisons

**Why**: Cross-function data flow not tracked.

```typescript
// ❌ NOT DETECTED
function compare(a, b) {
  return a === b;
}
compare(userToken, validToken);
```

**Mitigation**: Search codebase for comparison patterns.

## Further Reading

- **[Node.js timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)** - Official documentation
- **[CWE-208: Observable Timing Discrepancy](https://cwe.mitre.org/data/definitions/208.html)** - Official CWE entry
- **[Timing Attacks Explained](https://codahale.com/a-lesson-in-timing-attacks/)** - Classic article on timing attacks

Browser code is skipped. A timing oracle needs the comparison to run on a server the attacker
can time, and a React, Vue, Svelte or Angular module runs in the user's own browser. A file counts
as browser code when it starts with `'use client'`, is a `.vue` or `.svelte` file, is a `.tsx` or
`.jsx` file that renders JSX (a `.tsx` request handler with no JSX is still checked), or imports `react`, `react-dom`, `react-native`, `vue`, `svelte`, `preact`, `solid-js` or
`@angular/core` (a type-only import, including `import { type FC }`, does not count).
`'use server'` overrides all of these. A file that also holds server code is always checked: one
that exports a Remix `loader` or `action`, a Next.js `getServerSideProps`, `getStaticProps`,
`getStaticPaths`, `generateMetadata` or `generateStaticParams`, an app-router file
(`app/**/page.tsx`, `layout`, `route` and the rest, a server component unless it says
`'use client'`), or one with an inline `'use server'` action. Set `includeBrowserCode: true` to
check browser files anyway.

```tsx
import { useEffect } from 'react';
socket.on('message', (event) => {
  if (event.sessionId !== selectedSessionId) return; // the user's own tab, not a server
});
```

## ⚙️ Options

| Option                        | Type       | Default                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `secretPatterns`              | `string[]` | `["token","secret","password","hash","signature","mac","hmac","digest","apiKey","api_key","api-key","auth","authorization","credential","bearer","jwt","csrf","nonce","ssn","social_security","social-security","pii","private_key","private-key","privateKey","access_token","access-token","accessToken","refresh_token","refresh-token","refreshToken","session_id","session-id","sessionId","auth_token","auth-token","authToken","apiToken","sessionToken","idToken","csrfToken","encryption_key","encryption-key","encryptionKey"]` | Variable name patterns that indicate secrets                                                                                                                                                                                                                                                                                                                                                                                  |
| `untrustedSources`            | `string[]` | `["req","request","ctx","event"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Identifier roots treated as attacker-controlled (default: req, request, ctx, event)                                                                                                                                                                                                                                                                                                                                           |
| `reportUnverifiedComparisons` | `boolean`  | `false`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Report on a secret-looking name alone, without an attacker-controlled operand. Restores the pre-inversion behaviour.                                                                                                                                                                                                                                                                                                          |
| `includeBrowserCode`          | `boolean`  | `false`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Also check browser modules ('use client', .vue/.svelte files, .tsx/.jsx files that render JSX, or modules importing react, vue, svelte, preact, solid-js or @angular/core). A file that also holds server code (a Remix loader or action, a Next.js data function or app-router file, an inline 'use server' action) is always checked. Off by default: a comparison in the user's own browser is not a remote timing oracle. |
| `reportLiteralComparands`     | `boolean`  | `false`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Report a secret-named value compared against a string literal (password === 'mypass'), in either order, on the name alone. Off by default because string comparands are usually tags (revokedToken === 'access').                                                                                                                                                                                                             |
| `nonSecretWords`              | `string[]` | `["author","authors","authored","authoring","authorship","hashtag","hashtags","scheme","schemes"]`                                                                                                                                                                                                                                                                                                                                                                                                                                        | Whole words that mean a secretPatterns match was a collision (default: author, authors, authored, authoring, authorship, hashtag, hashtags, scheme, schemes). Replaces the list.                                                                                                                                                                                                                                              |
| `nonSecretTails`              | `string[]` | `["count","counts","limit","limits","usage","total","size","length","price","cost","quota","address","addresses","index","rank","percent","path","paths","pathname","pathnames","endpoint","endpoints","route","routes","hostname","host","port","origin","kind","kinds","type","types","flag","flags","category","id","ids"]`                                                                                                                                                                                                            | Trailing words that make the value a measurement or location rather than a credential (default: count, counts, limit, limits, usage, total, size, length, price, cost, quota, address, addresses, index, rank, percent, path, paths, pathname, pathnames, endpoint, endpoints, route, routes, hostname, host, port, origin, kind, kinds, type, types, flag, flags, category, id, ids). Replaces the list.                     |

### Literal comparands

By default a comparison against a string literal is skipped: in
`revokedToken === 'access'` the literal is a tag, not a secret, and a credential
written into the source is a CWE-798 finding for
`secure-coding/no-hardcoded-credentials`, not a timing oracle.
`reportLiteralComparands: true` reports a secret-named value against a string
literal on the name alone, in either order. It is what `eslint-plugin-security`'s
`detect-possible-timing-attacks` does, so a drop-in replacement for that plugin turns it on.

```jsonc
{
  "node-security/no-timing-unsafe-compare": [
    "error",
    { "reportLiteralComparands": true },
  ],
}
```

```js
if (password === 'mypass') {
} // reported with the option on
if ('mypass' === password) {
} // reported with the option on
```

### Both halves of the vocabulary are yours

`secretPatterns` says _this is a secret_; `nonSecretWords` and `nonSecretTails`
say _…except when_. All three are substring-or-word matches on identifiers, so
all three are tunable — a rule that lets you widen the positive list but not the
exclusions makes the widening unusable.

```jsonc
{
  "node-security/no-timing-unsafe-compare": [
    "error",
    {
      // Re-admit a bare `key`, then exclude the senses this codebase uses.
      "secretPatterns": ["token", "secret", "key", "signature"],
      "nonSecretWords": ["author", "hashtag", "keyboard", "keyring"],
      // `tokenChapter` is a position in a document, not a credential.
      "nonSecretTails": [
        "count",
        "limit",
        "size",
        "length",
        "index",
        "chapter",
      ],
    },
  ],
}
```

`nonSecretWords` matches any word of the identifier; `nonSecretTails` matches
only the last one. Setting either to `[]` removes that guard, which restores
the collisions it exists to prevent (`tokenCount` matching `token`, or
`authorId` matching a regex pattern such as `^auth` — a plain `auth` no longer
reaches `authorId`, because a short pattern must be a whole word).

An `id`/`ids` tail marks a record key (`localAuthId`, `tokenId`), but it does not
override a secret pattern that itself ends in that word: `sessionId` is listed
in `secretPatterns` and stays a secret. Only plain-word patterns do this: a regex
pattern ending in `id` does not lift the tail, so spell such a name as a plain
word (`tokenId`) or remove `id` from `nonSecretTails`.

### Values the caller already holds

- An `If-None-Match` / `If-Match` header compared with an etag is not reported.
  The etag went out in the `ETag` response header, so every client has it,
  even when it is a hash of the content. The etag is a keyless
  `createHash(…).update(…).digest(…)` chain under any name (quoted with string
  literals at most), or a value neither named as a secret nor derived with
  crypto. Only a binding written once is followed. The same header compared
  with a stored secret (`storedToken`), an HMAC under any name, a digest with
  something else concatenated in, or a configured secret still reports.
- A NestJS `@Body()` / `@Query()` / `@Param()` parameter reads as the request.
  A body field compared with another value from the same request has the
  caller on both sides, so it is not reported. A body field compared with a
  value the server stores (`dto.token !== user.resetToken`) is reported.
