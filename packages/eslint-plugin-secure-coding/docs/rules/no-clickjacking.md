# no-clickjacking

> **Keywords:** clickjacking, CWE-1021, iframe, X-Frame-Options, CSP, UI redressing
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Detects clickjacking vulnerabilities and missing frame protections. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-1021](https://cwe.mitre.org/data/definitions/1021.html) (Improper Restriction of Rendered UI Layers) |
| **Severity**      | Medium (CVSS 6.1)                                                                                         |
| **Auto-Fix**      | 💡 Suggestions available                                                                                  |
| **Category**      | Network & Headers                                                                                         |

## Vulnerability and Risk

**Vulnerability:** Clickjacking (UI Redressing) occurs when an attacker uses transparent or opaque layers (like `<iframe>`) to trick a user into clicking on a button or link on another page when they intended to click on the top level page.

**Risk:** Attackers can hijack clicks to perform sensitive actions on behalf of the user, such as transferring funds, changing settings, deleting accounts, or liking a social media post, without the user's knowledge.

## Rule Details

Clickjacking tricks users into clicking on invisible or disguised elements by overlaying them with transparent frames. Attackers can:

- Trick users into performing unintended actions
- Steal clicks and credentials
- Perform unauthorized transactions
- Bypass CSRF protections

### Why This Matters

| Issue                     | Impact               | Solution                      |
| ------------------------- | -------------------- | ----------------------------- |
| 🖱️ **Click Theft**        | Unauthorized actions | Use X-Frame-Options header    |
| 💳 **Fraud**              | Financial loss       | Implement CSP frame-ancestors |
| 🔓 **Account Compromise** | Data theft           | Add frame-busting code        |

## Examples

### ❌ Incorrect

```typescript
// Missing X-Frame-Options header
app.get('/sensitive', (req, res) => {
  res.send('<html>Sensitive content</html>');
});

// Allowing framing from any origin
res.setHeader('X-Frame-Options', 'ALLOWALL'); // Insecure!

// Transparent iframe overlay
<iframe
  src="https://target.com/transfer"
  style="opacity: 0; position: absolute; top: 0; left: 0;"
/>

// Missing CSP frame-ancestors
const csp = "default-src 'self'"; // No frame protection!
```

### ✅ Correct

```typescript
// Set X-Frame-Options header
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  // Or for same-origin only:
  // res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Use CSP frame-ancestors (more flexible)
res.setHeader(
  'Content-Security-Policy',
  "frame-ancestors 'self' https://trusted.com",
);

// Frame-busting JavaScript (legacy fallback)
if (top !== self) {
  top.location = self.location;
}

// Use helmet middleware
import helmet from 'helmet';
app.use(helmet.frameguard({ action: 'deny' }));
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-clickjacking': ['error', {
      trustedSources: ['self', 'https://trusted.com'],
      requireFrameBusting: true,
      detectTransparentOverlays: true
    }]
  }
}
```

## Options

| Option                      | Type       | Default    | Description                 |
| --------------------------- | ---------- | ---------- | --------------------------- |
| `trustedSources`            | `string[]` | `['self']` | Trusted iframe sources      |
| `requireFrameBusting`       | `boolean`  | `true`     | Require frame-busting code  |
| `detectTransparentOverlays` | `boolean`  | `true`     | Detect transparent overlays |

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
