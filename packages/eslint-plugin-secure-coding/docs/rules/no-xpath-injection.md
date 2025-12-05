# no-xpath-injection

> **Keywords:** XPath injection, CWE-643, XML, security, data extraction, authentication bypass

Detects XPath injection vulnerabilities. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-643 (XPath Injection) |
| **Severity** | Critical (CVSS 9.8) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Injection Prevention |

## Rule Details

XPath injection occurs when user input is improperly inserted into XPath queries, allowing attackers to:
- Access unauthorized XML nodes and data
- Extract sensitive information from XML documents
- Bypass authentication or authorization checks
- Perform data exfiltration

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🔓 **Auth Bypass** | Unauthorized access | Parameterize XPath queries |
| 📤 **Data Theft** | Sensitive data exposure | Validate and escape input |
| 🔍 **Enumeration** | Information disclosure | Use safe XPath construction |

## Examples

### ❌ Incorrect

```typescript
// String interpolation in XPath
const xpath = `/users/user[@name='${username}']`;
const result = xmlDoc.evaluate(xpath, xmlDoc);

// String concatenation
const query = "//user[@id='" + userId + "']";

// Template literal with untrusted input
const search = `/items/item[contains(text(), '${searchTerm}')]`;
```

### ✅ Correct

```typescript
// Escape XPath input
import { escapeXPath } from 'xpath-escape';
const xpath = `/users/user[@name='${escapeXPath(username)}']`;

// Use parameterized XPath construction
const safeQuery = buildXPath({
  element: 'user',
  attribute: 'name',
  value: username // automatically escaped
});

// Validate input against whitelist
if (isValidUsername(username)) {
  const xpath = `/users/user[@name='${username}']`;
}
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-xpath-injection': ['error', {
      xpathFunctions: ['evaluate', 'selectSingleNode', 'selectNodes'],
      xpathValidationFunctions: ['validateXPath', 'escapeXPath'],
      safeXpathConstructors: ['buildXPath', 'createXPath']
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `xpathFunctions` | `string[]` | `['evaluate', 'selectSingleNode']` | XPath functions to check |
| `xpathValidationFunctions` | `string[]` | `['validateXPath', 'escapeXPath']` | Functions that validate XPath input |
| `safeXpathConstructors` | `string[]` | `['buildXPath', 'createXPath']` | Safe XPath builder functions |

## Error Message Format

```
🔒 CWE-643 OWASP:A03-Injection CVSS:9.8 | XPath Injection detected | CRITICAL [SOC2,PCI-DSS]
   Fix: Use parameterized XPath or escape user input | https://owasp.org/...
```

## Further Reading

- **[OWASP XPath Injection](https://owasp.org/www-community/attacks/XPATH_Injection)** - Attack documentation
- **[CWE-643](https://cwe.mitre.org/data/definitions/643.html)** - Official CWE entry

## Related Rules

- [`no-xxe-injection`](./no-xxe-injection.md) - XXE injection prevention
- [`no-sql-injection`](./no-sql-injection.md) - SQL injection prevention

