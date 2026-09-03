# Why I Built a Security Linter for AI (And Why You Should Use It)

_By Ofri Peretz_

---

Last October, I watched a demo go catastrophically wrong.

A team was showcasing their AI customer service bot. The CEO asked a question. The bot responded with the company's AWS access keys—which had been accidentally included in the system prompt during development.

The demo was internal. But the lesson was clear: AI applications have failure modes we're not prepared for.

## The Problem With Generic Security Tools

Traditional security linters are pattern-based. They look for `eval()`, `innerHTML`, hardcoded passwords. They don't understand the unique vulnerabilities of AI applications.

Prompt injection doesn't look like SQL injection. System prompt leakage doesn't trigger an XSS rule. Token exhaustion isn't a buffer overflow.

We needed tools built for the AI era.

## Building eslint-plugin-vercel-ai-security

I chose to focus on the Vercel AI SDK for three reasons:

1. **It's the most popular TypeScript AI framework** — `generateText`, `streamText`, `generateObject`, and tool definitions are everywhere.

2. **It has a well-defined API surface** — Every AI call follows a consistent pattern, making static analysis feasible.

3. **It powers production apps** — Not experiments, not demos. Real applications handling real user data.

## The Rule Design Philosophy

Every rule in the plugin follows three principles:

### 1. SDK-Aware, Not Pattern-Matching

The plugin understands the Vercel AI SDK's API. It knows that `generateText({ prompt })` is an AI call, not a string template. This eliminates false positives.

### 2. Structured Error Messages

Each error includes CWE ID, OWASP category, CVSS score, and fix instructions. This helps both humans and AI coding assistants understand and fix the issue.

```bash
🔒 CWE-74 OWASP:LLM01 CVSS:9.0 | Unvalidated prompt input | CRITICAL
   Fix: Validate/sanitize user input before use
```

### 3. Graduated Severity

Not all security issues are equal. The plugin offers three presets:

- **Minimal**: Just the critical rules (prompt injection, unsafe output)
- **Recommended**: Critical rules + high-priority warnings
- **Strict**: Everything as errors (for production)

## The Coverage

19 rules covering:

- ✅ 100% of OWASP LLM Top 10 2025
- ✅ 90% of OWASP Agentic Top 10 2026 (ASI06 is N/A for TypeScript)

This isn't theoretical coverage. Each rule has extensive tests against real-world code patterns.

## The Punch Line

I didn't build this plugin because security is fun. I built it because I've seen what happens when AI applications go wrong.

The cost of installation is 60 seconds. The cost of a security incident is immeasurable.

[Try it](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security).

---

[Ofri Peretz](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)

**Keywords**: AI Security, Open Source, Vercel AI SDK, ESLint, LLM Security, OWASP, Building in Public
