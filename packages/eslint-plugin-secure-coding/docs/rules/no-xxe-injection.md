# no-xxe-injection

> **Keywords:** XXE, XML External Entity, CWE-611, SSRF, file disclosure, security, XML parsing

Detects XML External Entity (XXE) injection vulnerabilities. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-611 (XXE Injection) |
| **Severity** | Critical (CVSS 9.1) |
| **Auto-Fix** | ❌ Manual fix required |
| **Category** | Injection Prevention |

## Rule Details

XXE injection occurs when XML parsers process external entity references, allowing attackers to:
- Read sensitive local files (`/etc/passwd`, config files)
- Make HTTP requests to internal services (SSRF)
- Cause DoS through entity expansion ("billion laughs" attack)
- Perform port scanning of internal networks

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 📂 **File Disclosure** | Sensitive data exposure | Disable external entities |
| 🌐 **SSRF** | Internal network access | Use safe XML parsers |
| 💣 **DoS** | Service unavailability | Limit entity expansion |

## Examples

### ❌ Incorrect

```typescript
// Unsafe DOMParser usage
const parser = new DOMParser();
const doc = parser.parseFromString(userXml, 'text/xml');

// XML with dangerous entity declarations
const xml = `
  <!DOCTYPE foo [
    <!ENTITY xxe SYSTEM "file:///etc/passwd">
  ]>
  <data>&xxe;</data>
`;

// Parsing untrusted XML without validation
const data = xmlParser.parse(req.body.xml);
```

### ✅ Correct

```typescript
// Use safe parser with external entities disabled
const parser = new DOMParser();
// Set secure options
const doc = parser.parseFromString(sanitizedXml, 'text/xml');

// Validate and sanitize XML input
const safeXml = validateXml(userInput);
const data = xmlParser.parse(safeXml, { 
  noent: false,           // Disable entity resolution
  resolveExternals: false // Disable external references
});

// Use JSON instead of XML when possible
const data = JSON.parse(userInput);
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-xxe-injection': ['error', {
      safeParserOptions: ['noent', 'resolveExternals'],
      xmlValidationFunctions: ['validateXml', 'sanitizeXml']
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `safeParserOptions` | `string[]` | `['noent', 'resolveExternals']` | Options that indicate safe configuration |
| `xmlValidationFunctions` | `string[]` | `['validateXml', 'sanitizeXml']` | Functions that validate XML input |

## Error Message Format

```
🔒 CWE-611 OWASP:A03-Injection CVSS:9.1 | XXE Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA]
   Fix: Remove SYSTEM/PUBLIC entity declarations or use safe XML parser | https://owasp.org/...
```

## Further Reading

- **[OWASP XXE Prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)** - Prevention cheat sheet
- **[CWE-611](https://cwe.mitre.org/data/definitions/611.html)** - Official CWE entry
- **[PortSwigger XXE](https://portswigger.net/web-security/xxe)** - XXE attack techniques

## Related Rules

- [`no-xpath-injection`](./no-xpath-injection.md) - XPath injection prevention
- [`no-sql-injection`](./no-sql-injection.md) - SQL injection prevention

