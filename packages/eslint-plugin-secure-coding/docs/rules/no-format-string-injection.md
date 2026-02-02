---
title: no-format-string-injection
description: Detects format string injection vulnerabilities
tags: ['security', 'core']
category: security
severity: critical
cwe: CWE-134
autofix: false
---

> **Keywords:** format string injection, CWE-134, printf, util.format, logging, security

<!-- @rule-summary -->
Detects format string injection vulnerabilities
<!-- @/rule-summary -->

**CWE:** [CWE-74](https://cwe.mitre.org/data/definitions/74.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Detects format string injection vulnerabilities. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-134](https://cwe.mitre.org/data/definitions/134.html) (Format String Vulnerability) |
| **Severity**      | Critical (CVSS 9.8)                                                                      |
| **Auto-Fix**      | 💡 Suggestions available                                                                 |
| **Category**   | Security |

## Vulnerability and Risk

**Vulnerability:** Format string injection occurs when user input is passed as the format string argument to functions like `printf` or `util.format` in Node.js.

**Risk:** Attackers can use format specifiers (like `%s`, `%d`, or `%n`) to read data from the stack, crash the application (DoS), or potentially execute arbitrary code if the underlying library or language supports writing to memory via format strings.

## Rule Details

Format string injection occurs when user input is used as a format string in functions like `util.format()`, `printf`-style functions, or logging functions. Attackers can use format specifiers (%s, %d, %x) to:

- Leak sensitive memory contents
- Crash the application (DoS)
- Read stack data and bypass ASLR
- Potentially execute arbitrary code

### Why This Matters

| Issue                 | Impact                 | Solution                   |
| --------------------- | ---------------------- | -------------------------- |
| 💾 **Memory Leak**    | Information disclosure | Use static format strings  |
| 💥 **Crash**          | Denial of service      | Validate format specifiers |
| 🔓 **Code Execution** | Full system compromise | Escape user input          |

## Examples

### ❌ Incorrect

```typescript
// User input as format string
const message = util.format(userInput, data);

// Printf-style with user-controlled format
console.log(userFormat, value);
logger.info(req.body.message);

// Template string from user input
const format = getUserFormat();
const output = sprintf(format, ...args);
```

### ✅ Correct

```typescript
// Hardcoded format string
const message = util.format('User %s logged in from %s', username, ip);

// User input as argument, not format
console.log('User message: %s', userInput);
logger.info('Event: %s', req.body.message);

// Escape or validate user format
const safeFormat = escapeFormatSpecifiers(userInput);
const message = util.format('%s', safeFormat);
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-format-string-injection': ['error', {
      formatFunctions: ['util.format', 'sprintf', 'printf'],
      formatSpecifiers: ['%s', '%d', '%x', '%n'],
      userInputVariables: ['req', 'request', 'input', 'body']
    }]
  }
}
```

## Options

| Option                | Type       | Default                       | Description                    |
| --------------------- | ---------- | ----------------------------- | ------------------------------ |
| `formatFunctions`     | `string[]` | `['util.format', 'sprintf']`  | Format functions to check      |
| `formatSpecifiers`    | `string[]` | `['%s', '%d', '%x', '%n']`    | Format specifiers to detect    |
| `userInputVariables`  | `string[]` | `['req', 'request', 'input']` | User input patterns            |
| `safeFormatLibraries` | `string[]` | `[]`                          | Libraries with safe formatting |

## Error Message Format

```
🔒 CWE-134 OWASP:A03-Injection CVSS:9.8 | Format String Injection | CRITICAL [SOC2,PCI-DSS]
   Fix: Use hardcoded format strings or validate user formats | https://cwe.mitre.org/...
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

- **[CWE-134](https://cwe.mitre.org/data/definitions/134.html)** - Format string vulnerability
- **[OWASP Format String](https://owasp.org/www-community/attacks/Format_string_attack)** - Attack techniques

## Related Rules

- [`no-sql-injection`](./no-sql-injection.md) - SQL injection prevention
- [`detect-eval-with-expression`](./detect-eval-with-expression.md) - Code injection prevention