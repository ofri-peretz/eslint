---
title: 'Your AI Copilot is Writing Vulnerabilities. Here is How to Fix It.'
published: false
description: 'AI models are trained on insecure code from the internet. Without an acceptance layer, you are automating the insertion of CVEs.'
tags: ai, security, copilot, eslint
cover_image:
series: AI-Native Development
---

We are in the middle of a paradigm shift. GitHub Copilot, Cursor, and ChatGPT are writing a significant percentage of our production code. As an engineering leader, I love the velocity—but I am terrified by the **variance**.

AI models are trained on the internet. And the internet is full of insecure code.

When a Junior Engineer asks Copilot to "connect to the database," it might happily suggest a string concatenation pattern vulnerable to SQL Injection. If the engineer accepts it, you've just automated the insertion of a CVE.

## The "Acceptance Layer" Gap

The problem isn't the AI. The problem is that we lack a robust "Acceptance Layer" to verify AI output before it hits the repo.

Human review is no longer enough. The volume of code is too high, and AI code often _looks_ correct even when it's subtly broken (e.g., using `Math.random()` for a token generation).

## Context-Aware Security Linting

This is where next-generation tooling becomes critical. We need tools that don't just say "Error," but explain concepts to both the human AND the AI.

Unlike legacy plugins, modern security linting provides **structured metadata** with every error:

1. **CWE ID** (e.g., `CWE-89`)
2. **OWASP Category** (e.g., `A03:Injection`)
3. **CVSS Score** (Severity)
4. **Auto-Fix Instructions**

### Why This Matters for AI

When your AI assistant (like Cursor) sees a standard linter error, it guesses at the fix. But when it sees a structured error, it receives a precise instruction manual.

**Scenario**:

- **AI**: Writes `const query = "SELECT * FROM users WHERE id = " + id;`
- **Legacy Linter**: "Error: Generic Object Injection." → _AI might try to quote it, still insecure._
- **Modern Linter**: "Error: CWE-89 SQL Injection. Fix: Use parameterized query..." → _AI rewrites to `db.query('...', [id])`_

## The Punch Line: AI Needs Guardrails

You cannot stop your team from using AI. In fact, you should encourage it. But you must wrap that acceleration in safety.

Context-aware linting acts as the immune system for your codebase. It ensures that every line of code—whether written by a human or a robot—adheres to strict security standards before it ever reaches a pull request.

In the age of AI, **linting is your strongest line of defense**.

---


---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)

---

🚀 **Has AI ever suggested insecure code to you? Share your experience!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
