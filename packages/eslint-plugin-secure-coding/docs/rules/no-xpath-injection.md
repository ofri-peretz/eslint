---
title: no-xpath-injection
description: Detects XPath injection vulnerabilities
tags: ['security', 'core']
category: security
severity: critical
cwe: CWE-643
autofix: false
---

> **Keywords:** XPath injection, CWE-643, XML, security, data extraction, authentication bypass

<!-- @rule-summary -->
Detects XPath injection vulnerabilities
<!-- @/rule-summary -->

**CWE:** [CWE-74](https://cwe.mitre.org/data/definitions/74.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Detects XPath injection vulnerabilities. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-643](https://cwe.mitre.org/data/definitions/643.html) (XPath Injection) |
| **Severity**      | Critical (CVSS 9.8)                                                          |
| **Auto-Fix**      | 💡 Suggestions available                                                     |
| **Category**   | Security |

## Vulnerability and Risk

**Vulnerability:** XPath injection allows attackers to construct a query that interferes with the application's XML processing. It occurs when user input is concatenated directly into an XPath query string.

**Risk:** Similar to SQL Injection, this can allow attackers to read sensitive XML data, bypass authentication logic (if XML is used for auth), or modify XML structure if the query is used for updates.

## Rule Details

XPath injection occurs when user input is improperly inserted into XPath queries, allowing attackers to:

- Access unauthorized XML nodes and data
- Extract sensitive information from XML documents
- Bypass authentication or authorization checks
- Perform data exfiltration

### Why This Matters

| Issue              | Impact                  | Solution                    |
| ------------------ | ----------------------- | --------------------------- |
| 🔓 **Auth Bypass** | Unauthorized access     | Parameterize XPath queries  |
| 📤 **Data Theft**  | Sensitive data exposure | Validate and escape input   |
| 🔍 **Enumeration** | Information disclosure  | Use safe XPath construction |

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
const safeId = validateId(userInput); const xpath = `/users/user[@id="${safeId}"]`;
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
| ------ | ---- | ------- | ----------- |
| `reportDangerousConstructs` | `boolean` | `false` | Also report constant XPath containing ordinary axis syntax (//, text(), .., /*). These are not vulnerabilities; a constant expression has nothing to inject into. Off by default because it reported essentially every XPath in existence at CVSS 9.8. |
| `xpathFunctions` | `string[]` | `["evaluate","selectSingleNode","selectNodes","xpath","select","select1"]` | XPath evaluation methods treated as query sinks |
| `safeXpathConstructors` | `string[]` | `["buildXPath","createXPath","safeXPath","xpathBuilder"]` | Builders that produce a parameterized XPath expression |
| `xpathValidationFunctions` | `string[]` | `["validateXPath","escapeXPath","sanitizeXPath","cleanXPath"]` | Function names that escape or validate XPath input |
| `trustedSanitizers` | `string[]` | `[]` | Additional function names to consider as XPath sanitizers |
| `trustedAnnotations` | `string[]` | `[]` | Additional JSDoc annotations to consider as safe markers |
| `strictMode` | `boolean` | `false` | Disable all false positive detection (strict mode) |
| `xpathPackages` | `string[]` | `["xpath","xmldom-xpath","xpath.js","libxmljs","libxmljs2","@xmldom/xmldom"]` | Module specifiers whose exports evaluate an XPath expression, matched against a resolved import binding. Replaces the built-in list. |
| `additionalXpathPackages` | `string[]` | `[]` | Extra XPath package specifiers, on top of `xpathPackages`. |

## Error Message Format

```
🔒 CWE-643 OWASP:A03-Injection CVSS:9.8 | XPath Injection detected | CRITICAL [SOC2,PCI-DSS]
   Fix: Use parameterized XPath or escape user input | https://owasp.org/...
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Query from Variable

**Why**: Query strings from variables not traced.

```typescript
// ❌ NOT DETECTED - Query from variable
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.execute(query);
```

**Mitigation**: Always use parameterized queries.

### Custom Query Builders

**Why**: Custom ORM/query builders not recognized.

```typescript
// ❌ NOT DETECTED - Custom builder
customQuery.where(userInput).execute();
```

**Mitigation**: Review all query builder patterns.

### Template Engines

**Why**: Template-based queries not analyzed.

```typescript
// ❌ NOT DETECTED - Template
executeTemplate('query.sql', { userId });
```

**Mitigation**: Validate all template variables.

## Further Reading

- **[OWASP XPath Injection](https://owasp.org/www-community/attacks/XPATH_Injection)** - Attack documentation
- **[CWE-643](https://cwe.mitre.org/data/definitions/643.html)** - Official CWE entry

## Related Rules

- [`no-xxe-injection`](./no-xxe-injection.md) - XXE injection prevention
- [`no-sql-injection`](./no-sql-injection.md) - SQL injection prevention