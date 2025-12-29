# no-timing-unsafe-compare

Disallow timing-unsafe comparison of secrets.

## Rule Details

This rule detects `===` comparison of secret values, which can leak information through timing side-channels.

**CWE:** [CWE-208](https://cwe.mitre.org/data/definitions/208.html) - Observable Timing Discrepancy

## ❌ Incorrect

```javascript
if (userToken === storedToken) { ... }
if (apiKey === expectedKey) { ... }
if (user.password === inputPassword) { ... }
if (req.headers['x-api-key'] === process.env.API_KEY) { ... }
```

## ✅ Correct

```javascript
if (crypto.timingSafeEqual(Buffer.from(userToken), Buffer.from(storedToken))) { ... }

// Or use a library like secure-compare
const secureCompare = require('secure-compare');
if (secureCompare(userToken, storedToken)) { ... }
```

## Why This Matters

String comparison with `===` short-circuits on the first mismatched character. An attacker can measure response time to determine how many characters match, eventually recovering the entire secret.

## Options

```json
{
  "crypto/no-timing-unsafe-compare": [
    "error",
    {
      "secretPatterns": [
        "token",
        "secret",
        "key",
        "password",
        "hash",
        "signature",
        "ssn",
        "pii"
      ]
    }
  ]
}
```

## Default Patterns

The rule detects variables matching these patterns (camelCase, snake_case, kebab-case):

- `token`, `secret`, `key`, `password`, `hash`, `signature`
- `apiKey`, `api_key`, `api-key`
- `ssn`, `social_security`, `pii`
- `access_token`, `refresh_token`, `session_id`
