# no-pii-in-logs

> Prevent PII in console logs

## Rule Details

This rule prevent pii in console logs.

**OWASP Mobile Top 10:** M6  
**CWE:** [CWE-532](https://cwe.mitre.org/data/definitions/532.html)  
**Severity:** error

## Examples

### ❌ Incorrect

```javascript
console.log('User email:', user.email)

console.log({ email: user.email, name: user.name })
```

### ✅ Correct

```javascript
console.log('User logged in')

console.log('Transaction count:', count)
```

## When Not To Use It

This rule should be enabled for all mobile and web applications to ensure security best practices.

## Further Reading

- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
- [CWE-532 Details](https://cwe.mitre.org/data/definitions/532.html)

## Related Rules

- See other mobile security rules in this plugin

---

**Category:** Mobile Security  
**Type:** Problem  
**Recommended:** Yes
