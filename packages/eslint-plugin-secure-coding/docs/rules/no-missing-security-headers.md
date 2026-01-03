# no-missing-security-headers

> **Keywords:** no missing security headers, security, ESLint rule, JavaScript, TypeScript, CWE-693

ESLint Rule: no-missing-security-headers. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

## Quick Summary

| Aspect            | Details                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-693](https://cwe.mitre.org/data/definitions/693.html) (Protection Mechanism Failure) |
| **Severity**      | Medium (security vulnerability)                                                           |
| **Auto-Fix**      | ❌ No                                                                                     |
| **Category**      | Security                                                                                  |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                                   |
| **Best For**      | All web applications                                                                      |

## Vulnerability and Risk

**Vulnerability:** Missing security headers (like HSTS, X-Frame-Options, Content-Security-Policy) leaves the application vulnerable to various attacks.

**Risk:** Without these headers, applications are more susceptible to Man-in-the-Middle (MITM) attacks (missing HSTS), Clickjacking (missing X-Frame-Options), and Cross-Site Scripting (XSS) or Data Injection (missing CSP).

## Rule Details

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569',
    'c0': '#f8fafc',
    'c1': '#f1f5f9',
    'c2': '#e2e8f0',
    'c3': '#cbd5e1'
  }
}}%%
flowchart TD
    A[🔍 Detect no missing security headers] --> B{Valid pattern?}
    B -->|❌ No| C[🚨 Report violation]
    B -->|✅ Yes| D[✅ Pass]

    classDef startNode fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#1f2937
    classDef errorNode fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#1f2937

    class A startNode
    class C errorNode
```

### Why This Matters

| Issue                        | Impact           | Solution            |
| ---------------------------- | ---------------- | ------------------- |
| 🔒 **Security/Code Quality** | [Specific issue] | [Solution approach] |
| 🐛 **Maintainability**       | [Impact]         | [Fix]               |
| ⚡ **Performance**           | [Impact]         | [Optimization]      |

## Configuration

**No configuration options available.**

## Examples

### ❌ Incorrect

```typescript
// Example of incorrect usage
```

### ✅ Correct

```typescript
// Example of correct usage
```

## Configuration Examples

### Basic Usage

```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      'secure-coding/no-missing-security-headers': 'error',
    },
  },
];
```

## LLM-Optimized Output

```
🚨 no missing security headers | Description | MEDIUM
   Fix: Suggestion | Reference
```

## Related Rules

- [`rule-name`](./rule-name.md) - Description

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

- **[OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)** - Best practices
- **[CWE-693: Protection Mechanism Failure](https://cwe.mitre.org/data/definitions/693.html)** - Official CWE entry
