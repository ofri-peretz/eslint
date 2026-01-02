---
title: 'AI-Native ESLint: Why Error Messages Need CWE, OWASP, and CVSS'
published: false
description: 'AI agents need structured data to fix bugs. Here is why every ESLint error should include security context.'
tags: ai, eslint, security, devtools
cover_image:
series: AI-Native Development
---

**Legacy ESLint error:**

```
Potentially unsafe use of eval
```

**AI-Native error:**

```
🔒 CWE-95 OWASP:A03 CVSS:9.8 | Dynamic code execution detected | CRITICAL
   Fix: Avoid eval with user input. Use JSON.parse() or a safe parser.
```

The difference? **AI agents can fix the second one automatically.**

## The Problem with Generic Errors

When Cursor/Copilot/Claude reads "Potentially unsafe use of eval":

- Which vulnerability is this?
- How critical is it?
- What's the fix pattern?
- Should it be fixed now or later?

**The AI guesses.** Sometimes it guesses wrong.

## The AI-Native Standard

Every error message should include:

| Component  | Purpose                  | Example                   |
| ---------- | ------------------------ | ------------------------- |
| **CWE ID** | Exact vulnerability type | CWE-89                    |
| **OWASP**  | Compliance mapping       | A03:2021                  |
| **CVSS**   | Severity score           | 9.8 (Critical)            |
| **Fix**    | Exact remediation        | "Use parameterized query" |

## Why This Matters

### For Human Developers

```bash
# Old way: Google "eslint detect-eval-with-expression"
# New way: CWE-95 immediately searchable, linked to docs
```

### For AI Agents

```typescript
// Old: AI hallucinates a fix
// New: AI follows the exact Fix instruction
```

### For Security Teams

```bash
# Old: "We have 47 linting errors" (So what?)
# New: "We have 3 Critical (CVSS 9+), 12 High, 32 Medium"
```

### For Compliance

```bash
# Old: "Did we cover OWASP Top 10?" (Manual audit)
# New: Filter by OWASP:A03 → See all injection issues
```

## The Message Format

```
🔒 [CWE-XXX] [OWASP:XXX] [CVSS:X.X] | [Description] | [SEVERITY]
   [Risk]: [Why this is dangerous]
   [Fix]: [Exact action to take]
```

### Real Examples

```bash
# SQL Injection
🔒 CWE-89 OWASP:A03 CVSS:9.8 | Unsafe SQL query detected | CRITICAL
   Risk: User input in query enables database takeover
   Fix: Use parameterized query: pool.query('SELECT * FROM users WHERE id = $1', [id])

# XSS
🔒 CWE-79 OWASP:A03 CVSS:6.1 | innerHTML with user content | HIGH
   Risk: Cross-site scripting allows session hijacking
   Fix: Use textContent or DOMPurify.sanitize()

# Weak Crypto
🔒 CWE-328 OWASP:A02 CVSS:7.5 | MD5 hash algorithm | HIGH
   Risk: Collisions allow signature forgery
   Fix: Use crypto.createHash('sha256')
```

## How AI Uses This

### Cursor Example

```typescript
// Code with error:
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Cursor reads ESLint output:
// 🔒 CWE-89 OWASP:A03 CVSS:9.8 | SQL Injection
// Fix: Use parameterized query

// Cursor's fix:
const query = 'SELECT * FROM users WHERE id = $1';
await pool.query(query, [userId]);
```

### GitHub Copilot Example

```typescript
// Copilot sees: CWE-79 | innerHTML with user content | Fix: Use textContent

// Before:
element.innerHTML = userMessage;

// After (Copilot auto-fix):
element.textContent = userMessage;
```

## Implementing AI-Native Messages

### Rule Author Pattern

```javascript
// In your ESLint rule:
context.report({
  node,
  message: `🔒 CWE-89 OWASP:A03 CVSS:9.8 | Unsafe SQL query detected | CRITICAL
   Risk: User input in query enables SQL injection
   Fix: Use parameterized query: client.query('SELECT * FROM x WHERE id = $1', [id])`,
  // Include structured data for programmatic access
  data: {
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    cvss: 9.8,
    severity: 'critical',
    fix: 'Use parameterized queries',
  },
});
```

## All Our Plugins Follow This Standard

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';
import pg from 'eslint-plugin-pg';
import jwt from 'eslint-plugin-jwt';
import vercelAI from 'eslint-plugin-vercel-ai-security';

// All 100+ rules include:
// ✅ CWE mapping
// ✅ OWASP category
// ✅ CVSS score
// ✅ Actionable fix instructions
```

## Quick Install


```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

**75 rules. All AI-native. All with CWE/OWASP/CVSS.**

---

📦 [Full Plugin Ecosystem](https://github.com/ofri-peretz/eslint)
📖 [AI-Native Standard Spec](https://github.com/ofri-peretz/eslint/tree/main/docs/AI-NATIVE-STANDARD.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Are your ESLint errors AI-readable?**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
