---
title: no-permissive-trust-proxy
description: This rule detects unconditional 'trust proxy' settings, which make req.ip whatever the caller says it is and hand rate limits, IP allowlists and audit logs to the client
tags: ['security', 'express']
category: security
severity: medium
cwe: CWE-348
autofix: false
---

> Disallow unconditional 'trust proxy' — it makes req.ip client-controlled

<!-- @rule-summary -->

This rule detects unconditional 'trust proxy' settings, which make req.ip whatever the caller says it is and hand rate limits, IP allowlists and audit logs to the client
<!-- @/rule-summary -->

**Severity:** 🟠 Medium
**CWE:** [CWE-348](https://cwe.mitre.org/data/definitions/348.html)

## Rule Details

`app.set('trust proxy', true)` tells Express to believe the **entire** `X-Forwarded-For` chain and take its left-most entry as `req.ip`. Since anyone can send that header, `req.ip` becomes a client-supplied string.

Everything keyed on it follows:

- `express-rate-limit` buckets per `req.ip` — a fresh forged address per request means no limit at all, which turns a login endpoint back into a credential-stuffing target.
- IP allowlists and geo rules match a value the caller chose.
- Audit logs record the attacker's preferred address.

The fix is to say how many proxies actually sit in front of the app (`1` for a single load balancer), or to name their addresses. Express then walks exactly that many hops and takes the first address it did not receive from a trusted proxy.

## Examples

### ❌ Incorrect

```javascript
// Believes the whole X-Forwarded-For chain
app.set('trust proxy', true);

// Same setting, other spelling
app.enable('trust proxy');
```

### ✅ Correct

```javascript
// One reverse proxy (a load balancer / ingress) in front
app.set('trust proxy', 1);

// Only loopback is a proxy
app.set('trust proxy', 'loopback');

// Name the proxy subnet
app.set('trust proxy', '10.0.0.0/8');

// Decide per address
app.set('trust proxy', (ip) => ip === '10.0.0.1');

// No proxy at all
app.set('trust proxy', false);
```

## Suggestions

The rule offers one editor suggestion (no auto-fix): **trust exactly `hopCount` proxy hops** — `true` becomes the configured number, and `app.enable('trust proxy')` is rewritten to `app.set('trust proxy', <hops>)`.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `hopCount` | `number` | — | Number of reverse proxies used in the suggested fix |

```json
{
  "rules": {
    "express-security/no-permissive-trust-proxy": ["error", { "hopCount": 2 }]
  }
}
```

## When Not To Use It

If nothing keyed on `req.ip` has a security consequence in your app — no rate limiting, no allowlists, no IP in the audit trail — the setting is only a logging-accuracy question and the rule can be disabled.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Setting Value In A Variable

**Why**: No data-flow analysis — the value must be the `true` literal.

```typescript
// ❌ NOT DETECTED
const TRUST_ALL = true;
app.set('trust proxy', TRUST_ALL);
```

### Header Read Directly

**Why**: The rule is scoped to the Express setting, not to every `X-Forwarded-For` read.

```typescript
// ❌ NOT DETECTED — same forged value, read by hand
const clientIp = req.headers['x-forwarded-for'].split(',')[0];
```

**Mitigation**: Prefer `req.ip` with a correct `trust proxy` setting over parsing the header yourself.

### Non-Express Receivers

**Why**: The receiver must read as an Express app (`app`, `server`, `router`, `express`).

```typescript
// ❌ NOT DETECTED
httpServerConfig.set('trust proxy', true);
```

## Further Reading

- [CWE-348: Use of Less Trusted Source](https://cwe.mitre.org/data/definitions/348.html)
- [OWASP A05:2021 – Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- [Express: Behind proxies](https://expressjs.com/en/guide/behind-proxies.html)
