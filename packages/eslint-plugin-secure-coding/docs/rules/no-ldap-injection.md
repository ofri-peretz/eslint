---
title: no-ldap-injection
description: Detects LDAP injection vulnerabilities
tags: ['security', 'core']
category: security
severity: critical
cwe: CWE-90
autofix: false
---

> **Keywords:** LDAP injection, CWE-90, directory service, authentication bypass, security, Active Directory

<!-- @rule-summary -->
Detects LDAP injection vulnerabilities
<!-- @/rule-summary -->

**CWE:** [CWE-74](https://cwe.mitre.org/data/definitions/74.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Detects LDAP injection vulnerabilities. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-90](https://cwe.mitre.org/data/definitions/90.html) (LDAP Injection) |
| **Severity**      | Critical (CVSS 9.8)                                                       |
| **Auto-Fix**      | 💡 Suggestions available                                                  |
| **Category**   | Security |

## Vulnerability and Risk

**Vulnerability:** LDAP Injection allows attackers to modify LDAP statements by supplying malicious input that is not properly sanitized or escaped.

**Risk:** Attackers can alter LDAP queries to bypass authentication (e.g., logging in as any user), leak sensitive directory information (like emails, phone numbers, or passwords), or in some cases, modify user attributes.

## Rule Details

LDAP injection occurs when user input is improperly inserted into LDAP queries, allowing attackers to:

- Bypass authentication and authorization
- Extract sensitive directory information (users, groups, passwords)
- Perform unauthorized LDAP operations
- Enumerate users through blind injection techniques

### Why This Matters

| Issue              | Impact                  | Solution                    |
| ------------------ | ----------------------- | --------------------------- |
| 🔓 **Auth Bypass** | Unauthorized access     | Escape LDAP filter values   |
| 📤 **Data Theft**  | Directory data exposure | Validate and sanitize input |
| 👥 **Enumeration** | User discovery          | Use parameterized queries   |

## Examples

### ❌ Incorrect

```typescript
// String interpolation in LDAP filter
const filter = `(uid=${username})`;
ldapClient.search('ou=users,dc=example,dc=com', { filter });

// String concatenation
const searchFilter = '(cn=' + userInput + ')';

// Template literal with untrusted input
const ldapFilter = `(&(objectClass=user)(mail=${email}))`;
```

### ✅ Correct

```typescript
// Escape LDAP filter values
import { escape } from 'ldap-escape';
const filter = `(uid=${escape.filterValue(username)})`;

// Use ldapjs with proper escaping
const filter = new ldap.filters.EqualityFilter({
  attribute: 'uid',
  value: username, // ldapjs handles escaping
});

// Validate input before LDAP query
if (isValidUsername(username)) {
  const escapedUser = ldap.escape.filterValue(username);
  const filter = `(uid=${escapedUser})`;
}
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-ldap-injection': ['error', {
      ldapFunctions: ['search', 'bind', 'modify', 'add', 'delete'],
      ldapEscapeFunctions: ['escape.filterValue', 'escape.dnValue'],
      ldapValidationFunctions: ['validateLdapInput', 'sanitizeLdapFilter']
    }]
  }
}
```

## Options

| Option                    | Type       | Default                        | Description             |
| ------------------------- | ---------- | ------------------------------ | ----------------------- |
| `ldapFunctions`           | `string[]` | `['search', 'bind', 'modify']` | LDAP functions to check |
| `ldapEscapeFunctions`     | `string[]` | `['escape.filterValue']`       | LDAP escape functions   |
| `ldapValidationFunctions` | `string[]` | `['validateLdapInput']`        | Validation functions    |

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-90 OWASP:A05 CVSS:9.8 | LDAP Injection detected | CRITICAL
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A05_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-90](https://cwe.mitre.org/data/definitions/90.html) [OWASP:A05](https://owasp.org/Top10/A05_2021-Injection/) CVSS Score |
| **Issue Description** | Specific vulnerability | `LDAP Injection detected` |
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

- **[OWASP LDAP Injection](https://owasp.org/www-community/attacks/LDAP_Injection)** - Attack documentation
- **[CWE-90](https://cwe.mitre.org/data/definitions/90.html)** - Official CWE entry
- **[ldapjs Security](https://ldapjs.org/filters.html)** - Safe LDAP filter construction

## Related Rules

- [`no-sql-injection`](./no-sql-injection.md) - SQL injection prevention
- [`no-xpath-injection`](./no-xpath-injection.md) - XPath injection prevention