---
title: no-clickjacking
description: Detects clickjacking vulnerabilities and missing frame protections
tags: ['security', 'browser']
category: security
severity: medium
cwe: CWE-1021
autofix: false
---

> **Keywords:** clickjacking, CWE-1021, iframe, X-Frame-Options, CSP, UI redressing

<!-- @rule-summary -->

Detects clickjacking vulnerabilities and missing frame protections
<!-- @/rule-summary -->

> **⚠️ Deprecated.** This rule is deprecated and no longer in any preset. Use
> [`express-security/require-helmet`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-helmet.md),
> which sets `X-Frame-Options` and a `frame-ancestors` policy for every response through helmet. The rule is still exported and still works when enabled explicitly,
> until the next major removes it.

**CWE:** [CWE-1021](https://cwe.mitre.org/data/definitions/1021.html)  
**OWASP:** [Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)

Detects clickjacking vulnerabilities and missing frame protections. This rule is part of [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security).

## Quick Summary

| Aspect            | Details                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-1021](https://cwe.mitre.org/data/definitions/1021.html) (Improper Restriction of Rendered UI Layers) |
| **Severity**      | Medium (CVSS 6.1)                                                                                         |
| **Auto-Fix**      | ❌ No                                                                                                     |
| **Category**      | Security                                                                                                  |

## Vulnerability and Risk

**Vulnerability:** Clickjacking (UI Redressing) occurs when an attacker uses transparent or opaque layers (like `<iframe>`) to trick a user into clicking on a button or link on another page when they intended to click on the top level page.

**Risk:** Attackers can hijack clicks to perform sensitive actions on behalf of the user, such as transferring funds, changing settings, deleting accounts, or liking a social media post, without the user's knowledge.

## Rule Details

Clickjacking tricks users into clicking on invisible or disguised elements by overlaying them with transparent frames. Attackers can:

- Trick users into performing unintended actions
- Steal clicks and credentials
- Perform unauthorized transactions
- Bypass CSRF protections

### What the rule reports

| Finding                   | When                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `missingFrameBusting`     | A file that builds a document shell (`<html>` / `<head>` / `<body>` in JSX) and neither declares frame protection nor frame-busts. Only with `requireFrameBusting` (default `true`).                                                                                                                                                                               |
| `weakFrameProtection`     | A declaration that does not forbid framing, written anywhere: an `X-Frame-Options` value other than `DENY` / `SAMEORIGIN` (`ALLOWALL`, `ALLOW-FROM …`) in a header slot, or a Content-Security-Policy with no `frame-ancestors` (or `frame-ancestors *`). Not reported when the same file declares real protection, or when the shell finding above already fired. |
| `unsafeIframeUsage`       | An `<iframe>` whose `src` origin is not in `trustedSources` — an allowlist of iframe **source origins**, compared by origin, never by substring. `'self'` / `'same-origin'` accept relative URLs.                                                                                                                                                                  |
| `transparentFrameOverlay` | An invisible overlay in CSS — `opacity: 0`, `visibility: hidden`, a negative `z-index` — when `detectTransparentOverlays` is on. `display: none` is not an overlay.                                                                                                                                                                                                |
| `frameManipulation`       | Navigating `top.location` / `window.top` outside a frame-busting guard. `if (top != self) top.location = self.location` is the remediation and is not reported. Only an assignment counts: reading `top.location` (`'framed at ' + top.location`) navigates nothing.                                                                                                                                                                                                    |

### Why This Matters

| Issue                     | Impact               | Solution                      |
| ------------------------- | -------------------- | ----------------------------- |
| 🖱️ **Click Theft**        | Unauthorized actions | Use X-Frame-Options header    |
| 💳 **Fraud**              | Financial loss       | Implement CSP frame-ancestors |
| 🔓 **Account Compromise** | Data theft           | Add frame-busting code        |

## Examples

### ❌ Incorrect

```typescript
// A document shell with no frame protection (missingFrameBusting)
export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}

// Allowing framing from any origin (weakFrameProtection)
res.setHeader('X-Frame-Options', 'ALLOWALL'); // Insecure!

// A frame from an origin not in trustedSources (unsafeIframeUsage),
// made invisible on top of the page (transparentFrameOverlay)
<iframe
  src="https://target.com/transfer"
  style="opacity: 0; position: absolute; top: 0; left: 0;"
/>

// Missing CSP frame-ancestors (weakFrameProtection)
const csp = "default-src 'self'"; // No frame protection!
```

### ✅ Correct

```typescript
<iframe src="/local-content.html"></iframe>

res.setHeader('X-Frame-Options', 'DENY');
const csp = "default-src 'self'; frame-ancestors 'none'";

if (top !== self) {
  top.location = self.location; // frame-busting: the remediation
}
```

## Configuration

```javascript
{
  rules: {
    'browser-security/no-clickjacking': ['error', {
      trustedSources: ['self', 'https://trusted.com'],
      requireFrameBusting: true,
      detectTransparentOverlays: true
    }]
  }
}
```

## Options

| Option                      | Type       | Default                  | Description                                                                        |
| --------------------------- | ---------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `trustedSources`            | `string[]` | `["self","same-origin"]` | Iframe `src` origins treated as safe (`self` / `same-origin` accept relative URLs) |
| `requireFrameBusting`       | `boolean`  | `true`                   | Require frame-busting code in addition to headers                                  |
| `detectTransparentOverlays` | `boolean`  | `true`                   | Report transparent overlays positioned over clickable elements                     |
| `trustedAnnotations`        | `string[]` | `[]`                     | Additional JSDoc annotations to consider as safe markers                           |
| `strictMode`                | `boolean`  | `false`                  | Disable all false positive detection (strict mode)                                 |

## Error Message Format

```
🔒 CWE-1021 OWASP:A05-Misconfig CVSS:6.1 | Clickjacking Vulnerability | MEDIUM [SOC2,PCI-DSS]
   Fix: Add X-Frame-Options: DENY or CSP frame-ancestors | https://cheatsheetseries.owasp.org/...
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Values stored in variables are not traced.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Validate all user inputs.

### Wrapper Functions

**Why**: Custom wrappers not recognized.

```typescript
// ❌ NOT DETECTED - Wrapper
myWrapper(userInput); // Uses dangerous API internally
```

**Mitigation**: Apply rule to wrapper implementations.

### Dynamic Invocation

**Why**: Dynamic calls not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic
obj[method](userInput);
```

**Mitigation**: Avoid dynamic method invocation.

## Further Reading

- **[OWASP Clickjacking](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)** - Defense cheat sheet
- **[CWE-1021](https://cwe.mitre.org/data/definitions/1021.html)** - UI layer restriction
- **[MDN X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)** - Header documentation

## Related Rules

- [`no-missing-security-headers`](./no-missing-security-headers.md) - Missing security headers
- [`no-missing-cors-check`](./no-missing-cors-check.md) - CORS validation
