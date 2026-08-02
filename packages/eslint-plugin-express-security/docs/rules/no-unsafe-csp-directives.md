---
title: no-unsafe-csp-directives
description: This rule detects Content-Security-Policy directives that hand back the protection the header exists to provide — unsafe-inline, unsafe-eval, wildcard sources, unrestricted framing, and dropped mixed-content upgrades
tags: ['security', 'express']
category: security
severity: high
cwe: CWE-79
autofix: false
---

> Disallow Content-Security-Policy directives that permit 'unsafe-inline', 'unsafe-eval', wildcard sources, or unrestricted framing

<!-- @rule-summary -->

This rule detects Content-Security-Policy directives that hand back the protection the header exists to provide — unsafe-inline, unsafe-eval, wildcard sources, unrestricted framing, and dropped mixed-content upgrades
<!-- @/rule-summary -->

**Severity:** 🔴 High
**CWE:** [CWE-79](https://cwe.mitre.org/data/definitions/79.html) · [CWE-1021](https://cwe.mitre.org/data/definitions/1021.html) · [CWE-311](https://cwe.mitre.org/data/definitions/311.html)

## Rule Details

A CSP that ships `'unsafe-inline'` in `script-src` blocks nothing an attacker cares about: an injected `<script>` executes exactly as it would with no policy. The header is still present, so the scanner is happy and the audit checkbox is ticked.

The rule inspects the helmet CSP config — `helmet({ contentSecurityPolicy: { directives } })` and `helmet.contentSecurityPolicy({ directives })` — and reports five distinct shapes:

| Finding                     | Where                                                                | CWE      |
| --------------------------- | -------------------------------------------------------------------- | -------- |
| `'unsafe-inline'` / `'unsafe-eval'` | `default-src`, `script-src*`, `object-src`, `worker-src`, `style-src*` | CWE-79   |
| Wildcard source (`*`, `data:`, `http:`, `https:`) | same directives                                 | CWE-79   |
| `frame-ancestors: ['*']`    | any origin may frame the app                                          | CWE-1021 |
| No `frame-ancestors` while `useDefaults: false` | `frame-ancestors` has **no** fallback to `default-src` | CWE-1021 |
| `upgradeInsecureRequests: null` | helmet's documented way to drop the directive                     | CWE-311  |

Both the camelCase (`scriptSrc`) and header (`'script-src'`) spellings are recognised. A missing `frame-ancestors` is only a finding when `useDefaults: false` is explicitly set — otherwise helmet supplies `frame-ancestors 'self'` itself, and reporting it would be a false positive.

## Examples

### ❌ Incorrect

```javascript
// Inline script re-enabled — CSP now blocks nothing
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { scriptSrc: ["'self'", "'unsafe-inline'"] },
    },
  }),
);

// eval() re-enabled
app.use(
  helmet.contentSecurityPolicy({
    directives: { scriptSrc: ["'unsafe-eval'", "'self'"] },
  }),
);

// Wildcard sources — any host may serve code
app.use(helmet({ contentSecurityPolicy: { directives: { scriptSrc: ['*'] } } }));
app.use(
  helmet({
    contentSecurityPolicy: { directives: { 'object-src': ["'none'", 'data:'] } },
  }),
);

// Clickjacking wide open
app.use(
  helmet({ contentSecurityPolicy: { directives: { frameAncestors: ['*'] } } }),
);

// Defaults off and frame-ancestors never set — no framing limit at all
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'self'"] },
    },
  }),
);

// Mixed-content upgrade removed
app.use(
  helmet({
    contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
  }),
);
```

### ✅ Correct

```javascript
// Explicit, self-only policy with framing named
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  }),
);

// Helmet's defaults supply frame-ancestors
app.use(
  helmet({ contentSecurityPolicy: { directives: { scriptSrc: ["'self'"] } } }),
);

// Directives outside the script/style/framing set are not policed
app.use(
  helmet({
    contentSecurityPolicy: { directives: { imgSrc: ['*'], fontSrc: ['data:'] } },
  }),
);
```

Inline scripts that genuinely have to run should use a per-response nonce:

```javascript
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomUUID();
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      },
    },
  }),
);
```

## Suggestions

The source-level findings (`'unsafe-inline'`, `'unsafe-eval'`, wildcards) offer one editor suggestion: **remove the source from the directive array**, with whichever comma keeps the array valid. The framing and mixed-content findings have no mechanical fix — the correct directive depends on who is allowed to embed the app.

## Options

| Option          | Type      | Default | Description                                                        |
| --------------- | --------- | ------- | ------------------------------------------------------------------ |
| `checkStyleSrc` | `boolean` | `true`  | Also report unsafe sources in `style-src` / `style-src-elem` / `style-src-attr` |

```json
{
  "rules": {
    "express-security/no-unsafe-csp-directives": [
      "error",
      { "checkStyleSrc": false }
    ]
  }
}
```

## When Not To Use It

Apps that build the CSP in a reverse proxy or a CSP-specific library rather than helmet get nothing from this rule. If a CSS-in-JS runtime forces `'unsafe-inline'` in `style-src` and moving to nonces is not yet scheduled, set `checkStyleSrc: false` instead of turning the rule off.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Directives Built From A Variable

**Why**: No data-flow analysis — only object and array literals in the call are inspected.

```typescript
// ❌ NOT DETECTED
const directives = { scriptSrc: ["'unsafe-inline'"] };
app.use(helmet({ contentSecurityPolicy: { directives } }));
```

### Sources Computed At Runtime

**Why**: Each source must be a string literal.

```typescript
// ❌ NOT DETECTED
app.use(
  helmet({ contentSecurityPolicy: { directives: { scriptSrc: sources } } }),
);
```

### Policies Set As A Raw Header

**Why**: The rule is scoped to helmet's config shape.

```typescript
// ❌ NOT DETECTED
res.setHeader('Content-Security-Policy', "script-src 'unsafe-inline'");
```

## Further Reading

- [CWE-79: Cross-site Scripting](https://cwe.mitre.org/data/definitions/79.html)
- [CWE-1021: Improper Restriction of Rendered UI Layers](https://cwe.mitre.org/data/definitions/1021.html)
- [OWASP A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [Helmet: Content-Security-Policy](https://helmetjs.github.io/#content-security-policy)
- [MDN: CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors)
