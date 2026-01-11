# require-backend-authorization

> Security rule for mobile applications

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-602 OWASP:A06 CVSS:6.5 | Client-Side Enforcement of Server-Side Security detected | MEDIUM
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A06_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-602](https://cwe.mitre.org/data/definitions/602.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:6.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Client-Side Enforcement of Server-Side Security detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A06_2021-Injection/) |

## Rule Details

This rule security rule for mobile applications.

**OWASP Mobile Top 10:** Mobile  
**CWE:** [CWE-602](https://cwe.mitre.org/data/definitions/000.html)  
**Severity:** error

## Examples

### ❌ Incorrect

```javascript
// Insecure pattern
```

### ✅ Correct

```javascript
// Secure pattern
```

## When Not To Use It

This rule should be enabled for all mobile and web applications to ensure security best practices.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Credentials from Config

**Why**: Config values not traced.

```typescript
// ❌ NOT DETECTED - From config
const password = config.dbPassword;
```

**Mitigation**: Use proper secrets management.

### Environment Variables

**Why**: Env var content not analyzed.

```typescript
// ❌ NOT DETECTED - Env var
const secret = process.env.API_KEY;
```

**Mitigation**: Never hardcode or expose secrets.

### Dynamic Credential Access

**Why**: Dynamic property access not traced.

```typescript
// ❌ NOT DETECTED - Dynamic
const cred = credentials[type];
```

**Mitigation**: Audit all credential access patterns.

## Further Reading

- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
- [CWE-602 Details](https://cwe.mitre.org/data/definitions/000.html)

## Related Rules

- See other mobile security rules in this plugin

---

**Category:** Mobile Security  
**Type:** Problem  
**Recommended:** Yes
