---
title: 'Your AI Agent is Hallucinating Security Rules. Here’s the Fix.'
published: false
description: 'AI coding assistants struggle with library specifics. We built the first documentation hub designed to serve as Ground Truth for both Humans and Agents.'
tags: ai, security, documentation, productivity, eslint
cover_image:
series: Announcements
---

You've been there.

You ask your AI editor (Cursor, Windsurf, Copilot) to _"add security rules for PostgreSQL"_.

It confidently suggests:

```javascript
// ❌ AI Hallucination
plugins: ['postgres-security'], // Doesn't exist
rules: {
  'pg/no-injection': 'error' // Deprecated in 2019
}
```

You spend the next 15 minutes debugging a config that never should have been written.

**The problem isn't the AI. It's the Context.**

AI agents need a clean, structured Source of Truth to be effective. Relying on outdated training data or scraping messy npm pages leads to hallucinations.

## The Solution: Agentic-First Documentation

Today, we're launching **[eslint.interlace.tools](https://eslint.interlace.tools)**.

It’s not just "another docs site". It is the **Ground Truth** for the entire Interlace ESLint Ecosystem (Secure Coding, Vercel AI Security, Import Next, and more).

We built it with two users in mind:

1.  **You** (The Human Engineer)
2.  **Your Agent** (The AI Assistant)

## Why This Matters for Your Workflow

### 1. Stop Fact-Checking Your AI

We've structured every page to be semantically dense. When you point your agent to our docs (via `@docs` or context fetching), it sees:

- **Exact Rule IDs** (e.g., `secure-coding/no-hardcoded-credentials`)
- **Valid Configuration Patterns** (Flat Config native)
- **Correct Peer Dependencies**

### 2. The "30-Second Context Switch"

You shouldn't have to be a security expert to audit a generic codebase.

- **Search "SQL"** → Get the 5 rules for `eslint-plugin-pg`.
- **Search "Prompt Injection"** → Get the 4 rules for `eslint-plugin-vercel-ai-security`.
- **Search "Circular Dependency"** → Get the benchmark data for `eslint-plugin-import-next`.

All in one hub. No tab switching. No mental overhead.

### 3. Interactive Ground Truth

Every rule page includes **Live Examples**. You can see exactly what triggers a violation and what fixes it.

If you're unsure if a pattern is safe, checking the docs is faster than prompting an LLM and hoping it knows the answer.

## The Ecosystem in One Place

We've consolidated our entire security and performance suite:

| **Package**                                                                          | **Focus**          | **Agent "Win"**                                                |
| :----------------------------------------------------------------------------------- | :----------------- | :------------------------------------------------------------- |
| **[Secure Coding](https://eslint.interlace.tools/packages/secure-coding)**           | 89+ Security Rules | Stop hallucinating generic "security" plugins that do nothing. |
| **[Vercel AI Security](https://eslint.interlace.tools/packages/vercel-ai-security)** | AI Assurance       | Real rules for prompt injection and system leaks.              |
| **[PostgreSQL](https://eslint.interlace.tools/packages/pg)**                         | Database Safety    | Correct param patterns for `node-postgres`.                    |
| **[Import Next](https://eslint.interlace.tools/packages/import-next)**               | 100x Performance   | Benchmarks proving why you should switch.                      |

## How to Use It (The "Power Move")

Next time you start a project, don't ask your AI to "setup linting". Do this:

1.  Go to **[eslint.interlace.tools](https://eslint.interlace.tools)**.
2.  Copy the **"Quick Start"** block for your stack (Next.js, Node API, etc.).
3.  Paste it into your chat.

_Then_ let the AI handle the rest. You'll get a production-grade, secure setup in seconds—with zero hallucinations.

---

## ⚡ Try It Now

👉 **[eslint.interlace.tools](https://eslint.interlace.tools)**

---

## Quick Install (The "Cheat Sheet")

📦 [`eslint-plugin-secure-coding`](https://npmjs.com/package/eslint-plugin-secure-coding) — Security
📦 [`eslint-plugin-import-next`](https://npmjs.com/package/eslint-plugin-import-next) — Performance
📦 [`eslint-plugin-vercel-ai-security`](https://npmjs.com/package/eslint-plugin-vercel-ai-security) — AI Safety

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Does your Agent struggle with security configs? Let me know in the comments!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
