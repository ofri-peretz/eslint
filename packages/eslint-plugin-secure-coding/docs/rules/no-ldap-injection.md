# no-ldap-injection

> **Keywords:** LDAP injection, CWE-90, directory service, authentication bypass, security, Active Directory

Detects LDAP injection vulnerabilities. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-90 (LDAP Injection) |
| **Severity** | Critical (CVSS 9.8) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Injection Prevention |

## Rule Details

LDAP injection occurs when user input is improperly inserted into LDAP queries, allowing attackers to:
- Bypass authentication and authorization
- Extract sensitive directory information (users, groups, passwords)
- Perform unauthorized LDAP operations
- Enumerate users through blind injection techniques

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🔓 **Auth Bypass** | Unauthorized access | Escape LDAP filter values |
| 📤 **Data Theft** | Directory data exposure | Validate and sanitize input |
| 👥 **Enumeration** | User discovery | Use parameterized queries |

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
  value: username // ldapjs handles escaping
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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ldapFunctions` | `string[]` | `['search', 'bind', 'modify']` | LDAP functions to check |
| `ldapEscapeFunctions` | `string[]` | `['escape.filterValue']` | LDAP escape functions |
| `ldapValidationFunctions` | `string[]` | `['validateLdapInput']` | Validation functions |

## Error Message Format

```
🔒 CWE-90 OWASP:A03-Injection CVSS:9.8 | LDAP Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA]
   Fix: Use ldap.escape.filterValue() to escape user input | https://ldap.com/ldap-filters/
```

## Further Reading

- **[OWASP LDAP Injection](https://owasp.org/www-community/attacks/LDAP_Injection)** - Attack documentation
- **[CWE-90](https://cwe.mitre.org/data/definitions/90.html)** - Official CWE entry
- **[ldapjs Security](https://ldapjs.org/filters.html)** - Safe LDAP filter construction

## Related Rules

- [`no-sql-injection`](./no-sql-injection.md) - SQL injection prevention
- [`no-xpath-injection`](./no-xpath-injection.md) - XPath injection prevention

