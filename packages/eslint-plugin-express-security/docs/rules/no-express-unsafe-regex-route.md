# no-express-unsafe-regex-route

> Disallow vulnerable regular expressions in route definitions

**Severity:** 🔴 Critical  
**CWE:** [CWE-1333](https://cwe.mitre.org/data/definitions/1333.html)

## Rule Details

This rule detects Regular Expression Denial of Service (ReDoS) vulnerabilities in Express route patterns. Malicious input can cause exponential backtracking in vulnerable regex patterns, freezing your server.

## Examples

### ❌ Incorrect

```javascript
// Nested quantifiers - VULNERABLE to ReDoS
app.get(/^\/api\/(.*)*$/, handler);

// Overlapping alternations - VULNERABLE
app.get(/^(a+)+$/, handler);

// Evil regex patterns
app.get(/^([a-zA-Z]+)*$/, handler);
```

### ✅ Correct

```javascript
// Simple patterns - SAFE
app.get('/api/:resource', handler);

// Non-vulnerable regex - SAFE
app.get(/^\/api\/[a-z]+$/, handler);

// Use atomic groups or possessive quantifiers
app.get(/^\/api\/\w+$/, handler);
```

## Vulnerable Patterns

| Pattern        | Risk   | Example Attack                  |
| -------------- | ------ | ------------------------------- |
| `(a+)+`        | High   | `aaaaaaaaaaaaaaaaaaaaaaaaaaaa!` |
| `(.*)*`        | High   | Long strings with no match      |
| `([a-zA-Z]+)*` | High   | `aaaaaaaaaaaaaaaaaaaaaaaaaaa!`  |
| `(a\|aa)+`     | Medium | Alternation with overlap        |

## Options

| Option         | Type      | Default | Description                      |
| -------------- | --------- | ------- | -------------------------------- |
| `allowInTests` | `boolean` | `false` | Allow unsafe regex in test files |

```json
{
  "rules": {
    "express-security/no-express-unsafe-regex-route": "error"
  }
}
```

## When Not To Use It

Never disable this rule. ReDoS can completely freeze your server.

## Further Reading

- [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [safe-regex npm](https://www.npmjs.com/package/safe-regex)
