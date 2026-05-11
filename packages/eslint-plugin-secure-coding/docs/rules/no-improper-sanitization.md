---
title: no-improper-sanitization
description: Detects improper sanitization of user input
tags: ['security', 'core']
category: security
severity: medium
cwe: CWE-116
autofix: false
---

> **Keywords:** improper sanitization, CWE-116, CWE-79, XSS, encoding, escaping, security

<!-- @rule-summary -->
Detects improper sanitization of user input
<!-- @/rule-summary -->

**CWE:** [CWE-20](https://cwe.mitre.org/data/definitions/20.html)  
**OWASP Mobile:** [M4: Insufficient Input/Output Validation](https://owasp.org/www-project-mobile-top-10/)

Detects improper sanitization of user input. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-116](https://cwe.mitre.org/data/definitions/116.html) (Improper Encoding), [CWE-79](https://cwe.mitre.org/data/definitions/79.html) (XSS) |
| **Severity**      | High (CVSS 7.5)                                                                                                                                |
| **Auto-Fix**      | 💡 Suggestions available                                                                                                                       |
| **Category**   | Security |

## Value & investment case

> Why this rule pays for itself. Framework: [`cicd-impact/philosophy.md`](../../../../cicd-impact/philosophy.md).

| Dimension | Value |
| :--- | :--- |
| **CWE** | [CWE-79](https://cwe.mitre.org/data/definitions/79.html) — Cross-site Scripting (XSS) + [CWE-116](https://cwe.mitre.org/data/definitions/116.html) (Improper Encoding) |
| **Feedback-loop tier** | Editor / pre-commit (sub-second) — cheapest layer per the [feedback-loop hierarchy](../../../../cicd-impact/philosophy.md#the-feedback-loop-hierarchy--why-a-high-end-static-analyzer-is-the-highest-leverage-investment) |
| **Defensive-layer leverage** | ~10× cheaper than unit-test · ~1,000× cheaper than production rollback · 10,000+× cheaper than customer disclosure ([cost-ratio anchors](../../../../cicd-impact/philosophy.md#deliverability-axis--quality-risk-and-ma-diligence)) |
| **Niche relevance** | **Critical:** B2C, marketplaces, B2B SaaS (any frontend surface) · **High:** fintech (admin/back-office UI), healthtech (patient portals) · **Medium:** infra/devtools |
| **Investor-frame impact** | XSS is the most-cited OWASP Top-10 issue. Session hijacking → user-data exposure → mandatory disclosure. For B2C orgs, an XSS incident is a brand event with churn impact; for B2B, it's an enterprise-customer disclosure cycle. |

**Read also:** [`philosophy.md` §investor-frame](../../../../cicd-impact/philosophy.md#the-investor-frame--engineering-efficiency-as-a-portfolio-metric) · [`niche-presets.json`](../../../../cicd-impact/data/niche-presets.json) · [`analyzer-evaluation-framework.md`](../../../../cicd-impact/analyzer-evaluation-framework.md)

## Vulnerability and Risk

**Vulnerability:** Improper sanitization occurs when user input is treated as safe without removing or encoding potentially dangerous characters (like HTML tags or script injection vectors) before using it in a sensitive context (like rendering in a browser or executing as code).

**Risk:** This leads to Cross-Site Scripting (XSS), where attackers can inject malicious scripts to steal sessions, redirect users, or deface websites. It can also lead to other injection attacks depending on the context (e.g., SQL injection, Command injection).

## Rule Details

Improper sanitization occurs when user input is not properly cleaned before use in sensitive contexts. This can lead to:

- Cross-site scripting (XSS) attacks
- SQL/NoSQL injection
- Command injection
- Header injection

### Why This Matters

| Issue            | Impact                   | Solution                      |
| ---------------- | ------------------------ | ----------------------------- |
| 🎭 **XSS**       | Session hijacking        | Use context-aware encoding    |
| 💉 **Injection** | Data breach              | Use proper escaping functions |
| 🔓 **Bypass**    | Security control evasion | Defense in depth              |

## Examples

### ❌ Incorrect

```typescript
element.innerHTML = userInput.replace(/</g, "&lt;");
```

### ✅ Correct

```typescript
// Use DOMPurify for HTML
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);

// Context-aware encoding
import { encodeForHTML, encodeForJavaScript } from 'safe-encoder';
const htmlSafe = encodeForHTML(userInput);
const jsSafe = encodeForJavaScript(userInput);

// Use proper escaping libraries
import { escape } from 'html-escaper';
const safeHtml = escape(userInput);

// Use parameterized queries (not string escaping)
db.query('SELECT * FROM users WHERE name = ?', [userInput]);
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-improper-sanitization': ['error', {
      safeSanitizers: ['DOMPurify.sanitize', 'escape', 'encodeForHTML'],
      dangerousChars: ['<', '>', '"', "'", '&'],
      trustedLibraries: ['dompurify', 'html-escaper', 'xss']
    }]
  }
}
```

## Options

| Option             | Type       | Default                        | Description                       |
| ------------------ | ---------- | ------------------------------ | --------------------------------- |
| `safeSanitizers`   | `string[]` | `['DOMPurify.sanitize']`       | Safe sanitization functions       |
| `dangerousChars`   | `string[]` | `['<', '>', '"', "'"]`         | Characters that should be escaped |
| `contexts`         | `string[]` | `['html', 'js', 'url', 'css']` | Encoding contexts to check        |
| `trustedLibraries` | `string[]` | `['dompurify']`                | Trusted sanitization libraries    |

## Error Message Format

```
🔒 CWE-116 OWASP:A03-Injection CVSS:7.5 | Improper Sanitization | HIGH [SOC2,PCI-DSS]
   Fix: Use DOMPurify.sanitize() or context-aware encoding | https://cwe.mitre.org/...
```

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

- **[OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)** - XSS prevention cheat sheet
- **[CWE-116](https://cwe.mitre.org/data/definitions/116.html)** - Improper encoding
- **[DOMPurify](https://github.com/cure53/DOMPurify)** - HTML sanitization library

## Related Rules

- [`no-unsanitized-html`](./no-unsanitized-html.md) - XSS via innerHTML
- [`no-unescaped-url-parameter`](./no-unescaped-url-parameter.md) - URL parameter injection