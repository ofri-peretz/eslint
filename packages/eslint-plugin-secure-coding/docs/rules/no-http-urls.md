# no-http-urls

> Disallow hardcoded HTTP URLs (require HTTPS)

## Rule Details

This rule disallow hardcoded http urls (require https).

**OWASP Mobile Top 10:** M5  
**CWE:** [CWE-319](https://cwe.mitre.org/data/definitions/319.html)  
**Severity:** error

## Examples

### ❌ Incorrect

```javascript
const apiUrl = 'http://api.example.com/data'

fetch('http://insecure.example.com/api')
```

### ✅ Correct

```javascript
const apiUrl = 'https://api.example.com/data'

fetch('https://secure.example.com/api')

const devUrl = 'http://localhost:3000'
```

## When Not To Use It

This rule should be enabled for all mobile and web applications to ensure security best practices.

## Further Reading

- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
- [CWE-319 Details](https://cwe.mitre.org/data/definitions/319.html)

## Related Rules

- See other mobile security rules in this plugin

---

**Category:** Mobile Security  
**Type:** Problem  
**Recommended:** Yes
