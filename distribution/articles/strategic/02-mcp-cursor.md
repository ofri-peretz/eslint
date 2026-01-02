---
title: 'MCP + ESLint: Auto-Fixing Security Issues with Cursor'
published: false
description: "Configure ESLint's Model Context Protocol to let AI assistants automatically fix security vulnerabilities in your code."
tags: ai, cursor, eslint, security
cover_image:
canonical_url:
---

What if your AI assistant could not just find security issues, but fix them automatically?

With ESLint's Model Context Protocol (MCP), it can.

## What is MCP?

MCP is a standardized way for AI assistants (Cursor, GitHub Copilot, Claude) to:

1. Read ESLint errors
2. Understand the exact vulnerability
3. Apply the correct fix

The key: **structured error messages**.

## Legacy Error Messages

```bash
# eslint-plugin-security output
Unsafe use of eval
```

An AI assistant sees this and thinks: "Okay... but what should I do?"

## Agentic Error Messages

```bash
# eslint-plugin-secure-coding output
🔒 CWE-95 OWASP:A03 CVSS:9.8 | Dynamic code execution detected | CRITICAL
   Fix: Avoid eval with user input. Use JSON.parse() or a safe parser.
```

Now the AI knows:

- **CWE-95**: The exact vulnerability type
- **CVSS:9.8**: This is critical, prioritize it
- **Fix instruction**: Exactly what to do

## Setting Up MCP in Cursor

### 1. Install the Plugin

```bash
npm install --save-dev eslint-plugin-secure-coding
```

### 2. Configure ESLint

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs.recommended];
```

### 3. Enable MCP in Cursor

Create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

### 4. That's It

Now when Cursor sees a security issue, it can auto-fix.

## Demo: Before and After

### Before (Manual Fix Required)

```javascript
// Developer writes:
const query = `SELECT * FROM users WHERE id = ${userId}`;
await db.query(query);

// ESLint shows error
// Developer must research, understand, and fix manually
```

### After (AI Auto-Fix)

```javascript
// Developer writes:
const query = `SELECT * FROM users WHERE id = ${userId}`;
await db.query(query);

// Cursor reads MCP, understands the fix, applies:
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);
```

## The AGENTS.md Standard

For advanced AI behavior, each plugin includes `AGENTS.md`:

```markdown
# Agent Instructions for eslint-plugin-secure-coding

## Rule Resolution Strategies

### no-sql-injection

- PREFER parameterized queries over escaping
- Use $1, $2 placeholders for PostgreSQL
- Use ? placeholders for MySQL

### no-hardcoded-credentials

- PREFER environment variables
- Pattern: process.env.SECRET_NAME
- Suggest .env.example file creation

### detect-eval-with-expression

- PREFER JSON.parse for JSON data
- PREFER specific parsers for DSLs
- AVOID eval() in all cases
```

AI assistants read this and apply your preferred patterns.

## Compatible AI Assistants

| Assistant          | MCP Support    |
| ------------------ | -------------- |
| Cursor             | ✅ Full        |
| GitHub Copilot     | ✅ Via chat    |
| Claude             | ✅ Via API     |
| VS Code + Continue | ✅ With config |

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

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

Let AI assistants fix your security issues. Automatically.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [ESLint MCP Documentation](https://eslint.org/docs/latest/use/mcp)

📖 [AGENTS.md Template](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/AGENTS.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
