# no-disabled-certificate-validation

> Prevent disabled SSL/TLS validation

**Severity:** 🟠 HIGH  
**CWE:** [CWE-295](https://cwe.mitre.org/data/definitions/295.html)  
**OWASP Mobile:** [OWASP Mobile Top 10 M5](https://owasp.org/www-project-mobile-top-10/)

## Rule Details

This rule detects security violations related to Prevent disabled SSL/TLS validation.

## ❌ Incorrect

```typescript
// Example of insecure pattern detected by this rule
// TODO: Add specific examples based on implementation
```

## ✅ Correct

```typescript
// Example of secure pattern  
// TODO: Add specific examples based on implementation
```

## Known False Negatives

### Values from Variables

**Why**: Values stored in variables are not traced.

```typescript
// ❌ NOT DETECTED
const value = userInput;
operation(value);
```

**Mitigation**: Review code manually for security patterns.

### Dynamic Patterns

**Why**: Dynamic code paths cannot be statically analyzed.

```typescript
// ❌ NOT DETECTED
obj[method](data);
```

**Mitigation**: Avoid dynamic invocation with sensitive data.

### Third-Party Libraries

**Why**: External library implementations are not analyzed.

```typescript
// ❌ NOT DETECTED
library.operation(sensitiveData);
```

**Mitigation**: Review third-party library security documentation.

## References

- [CWE-295](https://cwe.mitre.org/data/definitions/295.html)
- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
