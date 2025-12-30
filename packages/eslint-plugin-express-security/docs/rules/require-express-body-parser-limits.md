# require-express-body-parser-limits

> Require size limits on body parser middleware to prevent DoS attacks

**Severity:** 🟡 Warning  
**CWE:** [CWE-400](https://cwe.mitre.org/data/definitions/400.html)

## Rule Details

This rule detects Express.js body parser middleware without size limits. Without limits, attackers can send extremely large payloads to exhaust server memory and cause Denial of Service.

**Related CVE:** CVE-2024-45590 - body-parser DoS vulnerability

## Examples

### ❌ Incorrect

```javascript
// No limit specified - VULNERABLE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Using body-parser without limits - VULNERABLE
app.use(bodyParser.json());
```

### ✅ Correct

```javascript
// With size limits - SAFE
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// body-parser with limits - SAFE
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));
```

## Options

| Option         | Type      | Default | Description                        |
| -------------- | --------- | ------- | ---------------------------------- |
| `allowInTests` | `boolean` | `false` | Allow missing limits in test files |

```json
{
  "rules": {
    "express-security/require-express-body-parser-limits": [
      "warn",
      {
        "allowInTests": true
      }
    ]
  }
}
```

## Recommended Limits

| Content Type | Recommended Limit                 |
| ------------ | --------------------------------- |
| JSON API     | `100kb` - `1mb`                   |
| Form data    | `100kb` - `500kb`                 |
| File uploads | Use `multer` with explicit limits |

## When Not To Use It

Never disable in production. Always set appropriate request size limits.

## Further Reading

- [CVE-2024-45590](https://nvd.nist.gov/vuln/detail/CVE-2024-45590)
- [Express body-parser](https://expressjs.com/en/api.html#express.json)
