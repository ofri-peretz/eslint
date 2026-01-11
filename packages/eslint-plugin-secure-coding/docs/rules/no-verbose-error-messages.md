# no-verbose-error-messages

> Security rule for mobile applications

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-209 OWASP:A02 CVSS:5.3 | Error Information Exposure detected | MEDIUM
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A02_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-209](https://cwe.mitre.org/data/definitions/209.html) [OWASP:A02](https://owasp.org/Top10/A02_2021-Injection/) [CVSS:5.3](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Error Information Exposure detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A02_2021-Injection/) |

## Rule Details

This rule security rule for mobile applications.

**OWASP Mobile Top 10:** Mobile  
**CWE:** [CWE-209](https://cwe.mitre.org/data/definitions/000.html)  
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

### Values from Variables

**Why**: Values stored in variables are not traced.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Validate all user inputs.

### Wrapper Functions

**Why**: Custom wrappers not recognized.

```typescript
// ❌ NOT DETECTED - Wrapper
myWrapper(userInput); // Uses dangerous API internally
```

**Mitigation**: Apply rule to wrapper implementations.

### Dynamic Invocation

**Why**: Dynamic calls not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic
obj[method](userInput);
```

**Mitigation**: Avoid dynamic method invocation.

## Further Reading

- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
- [CWE-209 Details](https://cwe.mitre.org/data/definitions/000.html)

## Related Rules

- See other mobile security rules in this plugin

---

**Category:** Mobile Security  
**Type:** Problem  
**Recommended:** Yes
