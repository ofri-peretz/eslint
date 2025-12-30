# eslint-plugin-agentic-security
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=agentic_security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=agentic_security)

> ⚠️ **DEPRECATION NOTICE**
>
> This package has been deprecated in favor of **SDK-specific ESLint plugins**.
>
> Agentic AI security rules that guess SDK interfaces (like `llm.complete`, `openai.chat`)
> are fundamentally unreliable. Each SDK has different APIs, and generic pattern matching
> provides false security confidence.

## Migration Guide

### For Cross-Vendor Security Rules

Use **[eslint-plugin-secure-coding](../eslint-plugin-secure-coding)** for:

- HTTP security (HTTPS enforcement, credential handling)
- Input validation (SQL injection, XSS prevention)
- Authentication patterns (OAuth, session security)
- Cryptography best practices
- Protocol-level security (WebSocket, SSE, gRPC)

### For SDK-Specific AI Security

Coming soon - SDK-specific ESLint plugins with **full API knowledge**:

| SDK          | Plugin (Planned)                      | Status     |
| ------------ | ------------------------------------- | ---------- |
| OpenAI       | `eslint-plugin-openai-security`       | 🔜 Roadmap |
| LangChain    | `eslint-plugin-langchain-security`    | 🔜 Roadmap |
| Anthropic    | `eslint-plugin-anthropic-security`    | 🔜 Roadmap |
| Vercel AI    | `eslint-plugin-vercel-ai-security`    | 🔜 Roadmap |
| Google GenAI | `eslint-plugin-google-genai-security` | 🔜 Roadmap |

## Why This Change?

### The Problem

Rules like `no-unsafe-prompt-concatenation` tried to detect patterns such as:

```javascript
// OpenAI SDK v4
await openai.chat.completions.create({ messages: [...] })

// Anthropic SDK
await anthropic.messages.create({ messages: [...] })

// LangChain
await llm.invoke([...])

// Vercel AI SDK
await generateText({ model, prompt: ... })
```

**Each SDK is different.** Generic pattern matching cannot reliably detect these variations.

### The Solution

SDK-specific plugins with:

- ✅ Full type definitions awareness
- ✅ Exact API structure knowledge
- ✅ Version-specific patterns
- ✅ Zero false positives/negatives

## OWASP LLM Top 10 2025 Coverage

The OWASP LLM Top 10 categories will be covered by SDK-specific plugins:

| OWASP Category                          | Coverage                                             |
| --------------------------------------- | ---------------------------------------------------- |
| LLM01: Prompt Injection                 | SDK-specific plugins                                 |
| LLM02: Sensitive Information Disclosure | `eslint-plugin-secure-coding` (PII/credential rules) |
| LLM05: Improper Output Handling         | SDK-specific plugins                                 |
| LLM06: Excessive Agency                 | SDK-specific plugins                                 |
| LLM10: Unbounded Consumption            | SDK-specific plugins                                 |

## Deprecation Timeline

- **v0.0.1**: Current version (deprecated)
- **v1.0.0**: Will re-export from SDK-specific plugins when available

## Contributing

Interested in SDK-specific plugins? See our [SDK Roadmap](./ROADMAP.md).

## License

MIT
