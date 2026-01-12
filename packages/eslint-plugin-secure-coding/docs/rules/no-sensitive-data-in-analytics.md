# no-sensitive-data-in-analytics

> Prevents PII being sent to analytics services

**Severity:** 🟠 HIGH  
**CWE:** [CWE-359: Exposure of Private Personal Information to an Unauthorized Actor](https://cwe.mitre.org/data/definitions/359.html)  
**OWASP Mobile:** [M6: Inadequate Privacy Controls](https://owasp.org/www-project-mobile-top-10/)

## Rule Details

This rule detects when sensitive user data (email, SSN, credit card, password, phone, address) is passed to analytics tracking calls like `analytics.track()`. Analytics platforms may not provide adequate security for sensitive data, and data breaches in analytics services can expose user PII.

### Why This Matters

Analytics platforms are third-party services with their own security postures. Sending PII to analytics:

- Violates GDPR Article 6 (lawful processing)
- Creates regulatory compliance risks (GDPR fines up to €20M or 4% of revenue)
- Exposes data to third-party breaches (analytics provider compromises)
- May violate user privacy expectations and consent agreements

## ❌ Incorrect

```typescript
// Sending email to analytics
analytics.track('User Signup', {
  email: user.email, // ❌ PII in analytics
  userId: user.id,
});

// Sending credit card details
analytics.track('Payment', {
  creditCard: cardNumber, // ❌ PCI-DSS violation
  amount: total,
});

// Sending password (never!)
analytics.track('Login Attempt', {
  username: user.username,
  password: user.password, // ❌ Critical security violation
});

// Sending SSN
analytics.track('Profile Update', {
  ssn: user.ssn, // ❌ HIPAA/PII violation
  name: user.name,
});
```

## ✅ Correct

```typescript
// Send only non-sensitive identifiers
analytics.track('User Signup', {
  userId: user.id, // ✅ Non-PII identifier
  timestamp: new Date(),
});

// Hash or mask sensitive data before tracking
analytics.track('Profile Update', {
  userId: user.id,
  hasEmail: !!user.email, // ✅ Boolean flag, not actual email
  emailDomain: user.email.split('@')[1], // ✅ Domain only (e.g., "gmail.com")
});

// Use event names and counts, not PII
analytics.track('Payment Completed', {
  userId: user.id,
  amount: total, // ✅ Transaction data, not PII
  currency: 'USD',
});
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### PII from Variables or Function Returns

**Why**: We only analyze object literal properties passed directly to `analytics.track()`. Values from variables or function calls are not traced.

```typescript
// ❌ NOT DETECTED - PII from variable
const userData = { email: user.email, phone: user.phone };
analytics.track('Event', userData);
```

**Mitigation**: Always review analytics tracking code manually for PII. Use TypeScript branded types to mark PII data.

### Custom Analytics Wrappers

**Why**: We only detect `analytics.track()` calls. Custom wrapper functions are not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
function trackUserEvent(data: any) {
  analytics.track('Event', data);
}
trackUserEvent({ email: user.email }); // PII in custom wrapper
```

**Mitigation**: Apply this rule to wrapper function implementations. Document analytics wrappers in code review guidelines.

### Dynamic Property Names

**Why**: Properties accessed via bracket notation or computed property names cannot be statically analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic property
const field = 'email';
analytics.track('Event', {
  [field]: user[field], // Dynamic, can't determine if PII
});
```

**Mitigation**: Avoid dynamic property names for analytics tracking. Use explicit, static property names.

## 🔗 Related Rules

- [`require-data-minimization`](./require-data-minimization.md) - Minimize data collection overall
- [`no-pii-in-logs`](./no-pii-in-logs.md) - Prevent PII in log files

## 📚 References

- [CWE-359: Exposure of Private Information](https://cwe.mitre.org/data/definitions/359.html)
- [OWASP Mobile M6: Inadequate Privacy Controls](https://owasp.org/www-project-mobile-top-10/)
- [GDPR Article 6: Lawful Processing](https://gdpr-info.eu/art-6-gdpr/)
