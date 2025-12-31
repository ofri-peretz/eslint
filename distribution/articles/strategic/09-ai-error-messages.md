---
title: 'Designing Error Messages for AI Coding Assistants'
published: false
description: 'Most linter error messages were designed for humans, not machines. Here is how to optimize for both—and why it matters for the future of development.'
tags: ai, eslint, cursor, copilot
cover_image:
series: AI-Native Development
---

# Designing Error Messages for AI Coding Assistants

AI coding assistants like Cursor, Copilot, and Windsurf are changing how we write code. But most linter error messages were designed for humans, not machines.

What happens when you optimize for both?

## The Problem with Traditional Error Messages

Here's a typical ESLint security error:

```
Possible SQL injection
```

A human can figure it out. An AI? It hallucinates. It guesses. It might suggest:

```javascript
// AI suggestion (wrong)
const query = sanitize('SELECT * FROM users WHERE id = ' + userId);
```

That's not how you fix SQL injection.

## The Structured Format

When building AI-native tooling, every message should be designed for **dual consumption**:

```
🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | SQL Injection detected | CRITICAL
   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])
```

### Line 1: Context

- **CWE-89** — Exact vulnerability classification (machine-readable)
- **OWASP:A03** — Category mapping (compliance-ready)
- **CVSS:9.8** — Severity score (prioritization)

### Line 2: Action

- **Exact fix** — Copy-paste ready code
- **Pattern shown** — Not just "use parameterized queries" but actual syntax

## Why This Works for AI

When an AI assistant sees this format:

1. **CWE reference** → It can look up the exact vulnerability type
2. **Concrete fix** → It can apply the pattern, not guess
3. **Compliance tags** → It understands the stakes

The result? **60-80% auto-fix rate** with high accuracy.

## The Human Benefit

This format also helps humans:

- **Junior devs** learn what the vulnerability actually is
- **Senior devs** can prioritize by CVSS score
- **Compliance teams** can map findings to frameworks instantly

## Implementation: MCP Integration

For full AI integration, configure ESLint's Model Context Protocol:

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

Now your AI assistant has direct access to lint results with full context.

## The Punch Line: Design for the Future

The next generation of developers will write code _with_ AI, not instead of it. The tools we build today need to speak both languages.

Structured error messages are table stakes. The question is: are your tools ready?

---

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 Install eslint-plugin-secure-coding
{% endcta %}

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)

---

🚀 **Are your tools AI-ready? What's your experience with AI auto-fixes?**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
