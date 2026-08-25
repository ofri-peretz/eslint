---
title: no-xxe-injection
description: Detects XML External Entity (XXE) injection vulnerabilities
tags: ['security', 'core']
category: security
severity: critical
cwe: CWE-611
autofix: false
---

> **Keywords:** XXE, XML External Entity, CWE-611, SSRF, file disclosure, security, XML parsing

<!-- @rule-summary -->
Detects XML External Entity (XXE) injection vulnerabilities
<!-- @/rule-summary -->

**CWE:** [CWE-74](https://cwe.mitre.org/data/definitions/74.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Detects XML External Entity (XXE) injection vulnerabilities. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-611](https://cwe.mitre.org/data/definitions/611.html) (XXE Injection) |
| **Severity**      | Critical (CVSS 9.1)                                                        |
| **Auto-Fix**      | ❌ Manual fix required                                                     |
| **Category**   | Security |

## Vulnerability and Risk

**Vulnerability:** XML External Entity (XXE) vulnerabilities occur when XML input containing a reference to an external entity is processed by a weakly configured XML parser.

**Risk:** An attacker can use XXE to access local files on the server (Local File Inclusion), perform Server-Side Request Forgery (SSRF) attacks, or cause Denial of Service (DoS) via "Billion Laughs" attacks (recursive entity expansion).

## Rule Details

XXE injection occurs when XML parsers process external entity references, allowing attackers to:

- Read sensitive local files (`/etc/passwd`, config files)
- Make HTTP requests to internal services (SSRF)
- Cause DoS through entity expansion ("billion laughs" attack)
- Perform port scanning of internal networks

### Why This Matters

| Issue                  | Impact                  | Solution                  |
| ---------------------- | ----------------------- | ------------------------- |
| 📂 **File Disclosure** | Sensitive data exposure | Disable external entities |
| 🌐 **SSRF**            | Internal network access | Use safe XML parsers      |
| 💣 **DoS**             | Service unavailability  | Limit entity expansion    |

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
const libxml = require("libxmljs"); const doc = libxml.parseXmlString(xmlString, { noent: false });
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
| ------ | ---- | ------- | ----------- |
| `safeParserOptions` | `string[]` | `["noent","resolveExternals","expandEntityReferences","entityResolver","processEntities","dtdload"]` | Parser option keys whose disabled value proves entity expansion is off |
| `xmlValidationFunctions` | `string[]` | `["validateXml","sanitizeXml","cleanXml","parseXmlSafe"]` | Function names that count as XML input validation |
| `xmlModules` | `string[]` | `["libxmljs","libxmljs2","xml2js","xml2json","fast-xml-parser","@xmldom/xmldom","xmldom","node-expat"]` | Module specifiers this rule treats as XML parsers, matched against a resolved import binding. Replaces the built-in list. |
| `additionalXmlModules` | `string[]` | `[]` | Extra XML package specifiers, on top of `xmlModules`. |
| `xmlParseMethods` | `string[]` | `["parseFromString","parseString","parseStringPromise","parseXml","parseXmlAsync","parseXmlString","parseXML"]` | Method names that only ever parse XML, matched as an exact method name whatever the receiver. Replaces the built-in list. |
| `additionalXmlParseMethods` | `string[]` | `[]` | Extra XML-only parse method names, on top of `xmlParseMethods`. |
| `dangerousParserOptions` | `string[]` | `["resolveExternals","expandEntityReferences","noent","processEntities","dtdload"]` | Parser option keys whose `true` value turns entity expansion ON. Replaces the built-in list. |
| `additionalDangerousParserOptions` | `string[]` | `[]` | Extra entity-expansion option keys, on top of `dangerousParserOptions`. |
| `entityIncapableModules` | `string[]` | `["xml2js","fast-xml-parser","@xmldom/xmldom","xmldom"]` | Packages proven unable to resolve an external entity, and therefore never reported for parsing untrusted input. Replaces the built-in list. |

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-611 OWASP:A05 CVSS:9.1 | XXE (XML External Entity) detected | CRITICAL
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A05_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-611](https://cwe.mitre.org/data/definitions/611.html) [OWASP:A05](https://owasp.org/Top10/A05_2021-Injection/) [CVSS:9.1](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
| **Issue Description** | Specific vulnerability | `XXE (XML External Entity) detected` |
| **Severity & Compliance** | Impact assessment | `CRITICAL` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A05_2021-Injection/) |

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

- **[OWASP XXE Prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)** - Prevention cheat sheet
- **[CWE-611](https://cwe.mitre.org/data/definitions/611.html)** - Official CWE entry
- **[PortSwigger XXE](https://portswigger.net/web-security/xxe)** - XXE attack techniques

## Related Rules

- [`no-xpath-injection`](./no-xpath-injection.md) - XPath injection prevention
- [`no-sql-injection`](./no-sql-injection.md) - SQL injection prevention