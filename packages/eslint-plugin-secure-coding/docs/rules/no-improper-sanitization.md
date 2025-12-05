# no-improper-sanitization

> **Keywords:** improper sanitization, CWE-116, CWE-79, XSS, encoding, escaping, security

Detects improper sanitization of user input. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-116 (Improper Encoding), CWE-79 (XSS) |
| **Severity** | High (CVSS 7.5) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Input Validation & XSS |

## Rule Details

Improper sanitization occurs when user input is not properly cleaned before use in sensitive contexts. This can lead to:
- Cross-site scripting (XSS) attacks
- SQL/NoSQL injection
- Command injection
- Header injection

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🎭 **XSS** | Session hijacking | Use context-aware encoding |
| 💉 **Injection** | Data breach | Use proper escaping functions |
| 🔓 **Bypass** | Security control evasion | Defense in depth |

## Examples

### ❌ Incorrect

```typescript
// Incomplete HTML escaping
const sanitized = input.replace('<', '&lt;');
element.innerHTML = sanitized; // Missing '>' escaping!

// Wrong context encoding
const jsValue = htmlEscape(userInput);
const script = `var x = "${jsValue}"`; // HTML escape in JS context!

// Using replace() for sanitization
const clean = userInput.replace(/[<>]/g, '');
// Bypassable with: <img onerror=alert(1) src=x>

// Incomplete SQL sanitization
const query = `SELECT * FROM users WHERE name = '${input.replace("'", "''")}'`;
// Doesn't handle all edge cases
```

### ✅ Correct

```typescript
// Use DOMPurify for HTML
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);

// Context-aware encoding
import { encodeForHTML, encodeForJavaScript } from 'safe-encoder';
const htmlSafe = encodeForHTML(userInput);
const jsSafe = encodeForJavaScript(userInput);

// Use proper escaping libraries
import { escape } from 'html-escaper';
const safeHtml = escape(userInput);

// Use parameterized queries (not string escaping)
db.query('SELECT * FROM users WHERE name = ?', [userInput]);
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-improper-sanitization': ['error', {
      safeSanitizers: ['DOMPurify.sanitize', 'escape', 'encodeForHTML'],
      dangerousChars: ['<', '>', '"', "'", '&'],
      trustedLibraries: ['dompurify', 'html-escaper', 'xss']
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `safeSanitizers` | `string[]` | `['DOMPurify.sanitize']` | Safe sanitization functions |
| `dangerousChars` | `string[]` | `['<', '>', '"', "'"]` | Characters that should be escaped |
| `contexts` | `string[]` | `['html', 'js', 'url', 'css']` | Encoding contexts to check |
| `trustedLibraries` | `string[]` | `['dompurify']` | Trusted sanitization libraries |

## Error Message Format

```
🔒 CWE-116 OWASP:A03-Injection CVSS:7.5 | Improper Sanitization | HIGH [SOC2,PCI-DSS]
   Fix: Use DOMPurify.sanitize() or context-aware encoding | https://cwe.mitre.org/...
```

## Further Reading

- **[OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)** - XSS prevention cheat sheet
- **[CWE-116](https://cwe.mitre.org/data/definitions/116.html)** - Improper encoding
- **[DOMPurify](https://github.com/cure53/DOMPurify)** - HTML sanitization library

## Related Rules

- [`no-unsanitized-html`](./no-unsanitized-html.md) - XSS via innerHTML
- [`no-unescaped-url-parameter`](./no-unescaped-url-parameter.md) - URL parameter injection

