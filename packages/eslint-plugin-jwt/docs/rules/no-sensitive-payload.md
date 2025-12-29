# no-sensitive-payload

> Prevent storing sensitive data in JWT payload which is only base64-encoded

**Severity:** 🟡 Medium  
**CWE:** [CWE-359](https://cwe.mitre.org/data/definitions/359.html)

## Rule Details

JWT payloads are NOT encrypted, only base64-encoded. Anyone can decode and read the payload contents. Sensitive data like passwords, PII, or financial information should never be stored in JWT payloads.

## Detected Sensitive Fields

- **Passwords**: password, passwd, pwd, secret
- **PII**: email, phone, ssn, address, dob
- **Financial**: creditCard, cardNumber, cvv, bankAccount
- **Tokens**: accessToken, refreshToken, apiKey
- Supports camelCase, snake_case, and kebab-case variants

## Examples

### ❌ Incorrect

```javascript
jwt.sign({ password: 'secret123' }, secret);
jwt.sign({ email: 'user@example.com' }, secret);
jwt.sign({ ssn: '123-45-6789' }, secret);
jwt.sign({ credit_card: '4111111111111111' }, secret);
```

### ✅ Correct

```javascript
// Store sensitive data server-side, reference by ID
jwt.sign({ sub: 'user-id-123', role: 'admin' }, secret);
jwt.sign({ userId: 'abc123', permissions: ['read'] }, secret);
```

## Options

```javascript
{
  "jwt/no-sensitive-payload": ["error", {
    "additionalSensitiveFields": ["customSecret", "internalId"]
  }]
}
```

## Further Reading

- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
