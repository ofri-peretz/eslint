# no-unsafe-regex-construction

> **Keywords:** no unsafe regex construction, security, ESLint rule, JavaScript, TypeScript, CWE-400, CWE-185, ReDoS, injection
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

ESLint Rule: no-unsafe-regex-construction with LLM-optimized suggestions and auto-fix capabilities. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

## Quick Summary

| Aspect            | Details                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-185](https://cwe.mitre.org/data/definitions/185.html) (Incorrect Regular Expression) |
| **Severity**      | Error (Security)                                                                          |
| **Auto-Fix**      | ❌ No                                                                                     |
| **Category**      | Security                                                                                  |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                                   |
| **Best For**      | Production applications handling user input                                               |
| **Suggestions**   | ✅ Advice on escaping input                                                               |

## Vulnerability and Risk

**Vulnerability:** Constructing regular expressions from untrusted or unvalidated user input.

**Risk:** Attackers can inject malicious regex patterns (Regex Injection) or complex patterns that cause excessive backtracking (ReDoS), leading to Denial of Service. They might also alter the logic of the regex to bypass validations (e.g., changing a match standard to match _anything_).

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-400 OWASP:A06 CVSS:7.5 | Uncontrolled Resource Consumption (ReDoS) detected | HIGH
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A06_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-400](https://cwe.mitre.org/data/definitions/400.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Uncontrolled Resource Consumption (ReDoS) detected` |
| **Severity & Compliance** | Impact assessment | `HIGH` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A06_2021-Injection/) |

## Rule Details

This rule detects the creation of `RegExp` objects using user-controlled input. Constructing a regular expression from untrusted input is dangerous because it leads to:

1.  **ReDoS (Regular Expression Denial of Service)**: An attacker can provide a pattern that causes catastrophic backtracking (e.g., `(a+)+`).
2.  **Logic Errors**: An attacker can inject special characters (like `*`, `+`, `|`) to alter the matching behavior in unintended ways.

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
    Start[User Input] --> Construct{new RegExp(input)}
    Construct -->|Unescaped| Risk[🚨 ReDoS / Injection Risk]
    Construct -->|Escaped| Safe[✅ Safe Pattern]

    Risk -->|Attacker Input| Crash[💥 App Crash/Dos]

    classDef startNode fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#1f2937
    classDef errorNode fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#1f2937
    classDef warnNode fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#1f2937

    class Start startNode
    class Crash errorNode
    class Risk warnNode
```

### Why This Matters

| Issue           | Impact                              | Solution                                 |
| --------------- | ----------------------------------- | ---------------------------------------- |
| 🔒 **Security** | Denial of Service (DoS)             | Escape user input before creating RegExp |
| 🐛 **Logic**    | Regex Injection (bypassing filters) | Use `escape-string-regexp`               |

## Configuration

This rule accepts an options object:

```typescript
{
  "rules": {
    "secure-coding/no-unsafe-regex-construction": ["error", {
      "allowLiterals": false,           // Default: false. Allow new RegExp("fixed-string").
      "trustedEscapingFunctions": ["escapeRegex", "escape", "sanitize"], // Default list of safe functions.
      "maxPatternLength": 100           // Default: 100. Limit the length of dynamic patterns.
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
// Direct user input usage
const pattern = new RegExp(req.query.search);

// Template literal with user input
const pattern2 = new RegExp(`^${userPrefix}`);

// Passing variables without sanitization
function search(term) {
  return new RegExp(term, 'i');
}
```

### ✅ Correct

```typescript
import escapeStringRegexp from 'escape-string-regexp';

// Escaping input first
const safePattern = new RegExp(escapeStringRegexp(req.query.search));

// Fixed strings (if allowLiterals: true)
const fixed = new RegExp('^[a-z]+$');

// RegExp literal (always preferred if pattern is static)
const literal = /^[a-z]+$/;
```

## LLM-Based Suggestions

The rule provides guidance on how to fix detected patterns:

- **"Escape User Input"**: Suggests using a library like `escape-string-regexp` to neutralize special characters.
- **"Use Literal"**: Suggests converting `new RegExp("constant")` to `/constant/` if possible.

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

- [OWASP: Regular Expression Denial of Service](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [MDN: RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
- [NPM: escape-string-regexp](https://www.npmjs.com/package/escape-string-regexp)
