---
title: require-strict-transport-security
description: This rule detects HSTS configurations that leave a downgrade window open — the header disabled, a max-age below the six-month floor, or subdomains excluded
tags: ['security', 'express']
category: security
severity: high
cwe: CWE-319
autofix: false
---

> Require a Strict-Transport-Security header with a long max-age and includeSubDomains

<!-- @rule-summary -->

This rule detects HSTS configurations that leave a downgrade window open — the header disabled, a max-age below the six-month floor, or subdomains excluded
<!-- @/rule-summary -->

**Severity:** 🔴 High
**CWE:** [CWE-319](https://cwe.mitre.org/data/definitions/319.html)

## Rule Details

`Strict-Transport-Security` is what stops the first request of a session from being made — and intercepted — over plaintext HTTP. Three configurations quietly give that back:

- `helmet({ hsts: false })` removes the header entirely.
- `helmet.hsts({ maxAge: 300 })` protects for five minutes; the next visit after it lapses is downgradeable again.
- `includeSubDomains: false` leaves every subdomain answering over HTTP — enough to set a cookie the parent domain trusts.

The rule fires on the `hsts` / `strictTransportSecurity` option of `helmet()` and on the `helmet.hsts()` / `helmet.strictTransportSecurity()` middleware factories. **An omitted option is never reported**: helmet's default is already 365 days with `includeSubDomains`. Only an explicit weakening is a finding.

The default floor is 15,552,000 seconds (six months) — below that an HSTS policy stops being meaningful. It is **not** the preload bar: [hstspreload.org](https://hstspreload.org/) submission requires `max-age` of at least 31,536,000 (one year) together with `includeSubDomains` and `preload`. Set `minMaxAge: 31536000` if you intend to submit.

## Examples

### ❌ Incorrect

```javascript
// Header removed
app.use(helmet({ hsts: false }));
app.use(helmet({ strictTransportSecurity: false }));

// Five-minute protection window
app.use(helmet({ hsts: { maxAge: 300 } }));
app.use(helmet.hsts({ maxAge: 3600 }));

// Subdomains left on plaintext HTTP
app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: false } }));
```

### ✅ Correct

```javascript
// Helmet's default: 365 days, includeSubDomains
app.use(helmet());

// Explicit and preload-eligible
app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }),
);

// Exactly at the floor
app.use(helmet({ hsts: { maxAge: 15552000 } }));
```

## Suggestions

The `max-age` finding offers one editor suggestion (no auto-fix): **raise `maxAge` to the configured minimum**. The disable and subdomain findings have no mechanical fix — removing the entry or flipping the flag is a deployment decision (every subdomain must serve HTTPS first).

## Options

| Option              | Type      | Default    | Description                                       |
| ------------------- | --------- | ---------- | ------------------------------------------------- |
| `minMaxAge`         | `number`  | `15552000` | Minimum accepted `max-age`, in seconds (six months; use `31536000` for preload eligibility) |
| `requireSubDomains` | `boolean` | `true`     | Report `includeSubDomains: false`                 |

```json
{
  "rules": {
    "express-security/require-strict-transport-security": [
      "error",
      { "minMaxAge": 31536000, "requireSubDomains": true }
    ]
  }
}
```

## When Not To Use It

While migrating subdomains to HTTPS, set `requireSubDomains: false` rather than disabling the rule — you keep the `max-age` and disable checks. An app served only over a private network with no TLS at all has no use for the rule.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Config Held In A Variable

**Why**: No data-flow analysis — only object literals in the call are inspected.

```typescript
// ❌ NOT DETECTED
const hstsConfig = { maxAge: 60 };
app.use(helmet({ hsts: hstsConfig }));
```

### Computed max-age

**Why**: The value must be a numeric literal to be compared with the floor.

```typescript
// ❌ NOT DETECTED
app.use(helmet({ hsts: { maxAge: ONE_HOUR } }));
```

**Mitigation**: Inline the number, or name the constant something the reviewer can price (`ONE_YEAR_SECONDS`).

### Headers Set Outside Helmet

**Why**: The rule is scoped to helmet's API.

```typescript
// ❌ NOT DETECTED
res.setHeader('Strict-Transport-Security', 'max-age=60');
```

## Further Reading

- [CWE-319: Cleartext Transmission of Sensitive Information](https://cwe.mitre.org/data/definitions/319.html)
- [OWASP A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [Helmet: Strict-Transport-Security](https://helmetjs.github.io/#strict-transport-security)
- [hstspreload.org submission requirements](https://hstspreload.org/)
