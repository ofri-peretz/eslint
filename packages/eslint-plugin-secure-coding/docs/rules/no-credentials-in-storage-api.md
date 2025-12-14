# no-credentials-in-storage-api

> Disallow storing credentials in browser/mobile storage APIs

## Rule Details

This rule disallow storing credentials in browser/mobile storage apis.

**OWASP Mobile Top 10:** M1  
**CWE:** [CWE-522](https://cwe.mitre.org/data/definitions/522.html)  
**Severity:** error

## Examples

### ❌ Incorrect

```javascript
localStorage.setItem('password', userPassword)

sessionStorage.setItem('apiToken', token)

AsyncStorage.setItem('secret', apiSecret)
```

### ✅ Correct

```javascript
localStorage.setItem('theme', 'dark')

sessionStorage.setItem('lastVisit', Date.now())

AsyncStorage.setItem('preferences', JSON.stringify(prefs))
```

## When Not To Use It

This rule should be enabled for all mobile and web applications to ensure security best practices.

## Further Reading

- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
- [CWE-522 Details](https://cwe.mitre.org/data/definitions/522.html)

## Related Rules

- See other mobile security rules in this plugin

---

**Category:** Mobile Security  
**Type:** Problem  
**Recommended:** Yes
