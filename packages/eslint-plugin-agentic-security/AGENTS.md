# AGENTS.md

> Context for AI coding agents working on eslint-plugin-agentic-security

## ⚠️ DEPRECATION NOTICE

This package has been **deprecated** in favor of SDK-specific ESLint plugins.

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-agentic-security

# Run tests
nx test eslint-plugin-agentic-security
```

## Migration Guide

### For Cross-Vendor Security Rules

Use **eslint-plugin-secure-coding** for:

- HTTP security (HTTPS enforcement, credential handling)
- Input validation (SQL injection, XSS prevention)
- Authentication patterns (OAuth, session security)

### For SDK-Specific AI Security

Use SDK-specific plugins:

| SDK       | Plugin                             |
| --------- | ---------------------------------- |
| OpenAI    | `eslint-plugin-openai-security`    |
| Anthropic | `eslint-plugin-anthropic-security` |
| Google AI | `eslint-plugin-google-ai-security` |
| Vercel AI | `eslint-plugin-vercel-ai-security` |

## Why Deprecated?

Agentic AI security rules that guess SDK interfaces (like `llm.complete`, `openai.chat`) are fundamentally unreliable. Each SDK has different APIs, and generic pattern matching provides false security confidence.
