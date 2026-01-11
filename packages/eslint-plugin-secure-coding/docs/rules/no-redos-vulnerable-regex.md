# no-redos-vulnerable-regex

> **Keywords:** no redos vulnerable regex, security, ESLint rule, JavaScript, TypeScript, CWE-400, CWE-1333, DoS, catastrophic backtracking

ESLint Rule: no-redos-vulnerable-regex. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

## Quick Summary

| Aspect          | Details                                         |
| --------------- | ----------------------------------------------- |
| **Severity**    | Error (Security)                                |
| **Auto-Fix**    | ❌ No (requires manual review)                  |
| **Category**    | Security                                        |
| **ESLint MCP**  | ✅ Optimized for ESLint MCP integration         |
| **Best For**    | Production applications handling user input     |
| **Suggestions** | ✅ Advice on using atomic groups/safe libraries |

## Vulnerability and Risk

**Vulnerability:** Regular Expression Denial of Service (ReDoS) occurs when a regular expression is crafted in a way that causes catastrophic backtracking when processing certain input strings.

**Risk:** An attacker can provide a specially crafted input that triggers this catastrophic backtracking, causing the application to consume excessive CPU resources and become unresponsive (Denial of Service).

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

This rule detects regular expressions that are vulnerable to **Regular Expression Denial of Service (ReDoS)**. ReDoS occurs when a regex engine takes an exponential amount of time to find a match (or fail to match) for certain inputs, usually due to "catastrophic backtracking".

Catastrophic backtracking happens when a regex contains:

1.  **Nested Quantifiers**: e.g., `(a+)+`
2.  **Overlapping Disjunctions**: e.g., `(a|a)+`
3.  **Ambiguous Repetitions**: e.g., `(.*?)*`

When these patterns are applied to a long string that _almost_ matches but fails at the end, the regex engine tries every possible combination of repetitions, leading to $O(2^n)$ runtime.

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
    Start[User Input String] --> Regex{Regex Engine}
    Regex -->|Safe Pattern| Match[Match/No Match (Fast)]
    Regex -->|Vulnerable Pattern| Backtrack{Catastrophic Backtracking?}
    Backtrack -->|Yes| Freeze[💥 CPU Spike / Denial of Service]
    Backtrack -->|No| Match

    classDef startNode fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#1f2937
    classDef errorNode fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#1f2937
    classDef warnNode fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#1f2937

    class Start startNode
    class Freeze errorNode
    class Backtrack warnNode
```

### Why This Matters

| Issue              | Impact                          | Solution                                                              |
| ------------------ | ------------------------------- | --------------------------------------------------------------------- |
| 🔒 **Security**    | Denial of Service (DoS) attacks | Use [atomic groups](https://github.com/google/re2) or simple patterns |
| ⚡ **Performance** | Server freezing, high CPU usage | Validate input length, use timeouts (if available)                    |
| 🐛 **Reliability** | Unexpected application crashes  | avoid nested quantifiers `(a+)+`                                      |

## Configuration

This rule accepts an options object:

```typescript
{
  "rules": {
    "secure-coding/no-redos-vulnerable-regex": ["error", {
      "allowCommonPatterns": false, // Default: false. Allow some common but potentially risky patterns if safe in context.
      "maxPatternLength": 500       // Default: 500. Maximum length of regex string to analyze.
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
// Nested quantifiers - O(2^n)
const badRegex1 = /(a+)+/;
const badRegex2 = /([a-zA-Z]+)*$/;

// Overlapping disjunctions
const badRegex3 = /(a|a)+/;

// Ambiguous optional repetitions
const badRegex4 = /(.*)*$/;

// Usage in RegExp constructor
const userPattern = new RegExp('(a+)+');
```

### ✅ Correct

```typescript
// Non-nested quantifiers
const goodRegex1 = /a+/;
const goodRegex2 = /[a-zA-Z]+$/;

// Atomic groups (simulated in JS using lookahead)
// (?=(a+))\1 matches 'a+' atomically (no backtracking into it)
const atomicRegex = /(?=(a+))\1/;

// Using a safe library like validator.js for email/URL instead of custom regex
import isEmail from 'validator/lib/isEmail';
const valid = isEmail(input);
```

## LLM-Based Suggestions

The rule provides guidance on how to fix detected patterns:

- **"Use Atomic Groups"**: Suggests simulating atomic groups or using `re2`.
- **"Restructure Regex"**: Recommends removing nesting or overlaps.
- **"Use Safe Library"**: Suggests using `validator` or `zod` for common patterns like emails.

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
- [CWE-1333: Inefficient Regular Expression Complexity](https://cwe.mitre.org/data/definitions/1333.html)
- [Runaway Regular Expressions: Catastrophic Backtracking](https://www.regular-expressions.info/catastrophic.html)
