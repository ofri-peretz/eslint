# `no-hardcoded-api-keys`

> Detects hardcoded API keys and secrets in AI SDK configuration.

## 📊 Rule Details

| Property           | Value                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **Type**           | problem                                                                                   |
| **Severity**       | 🔴 CRITICAL                                                                               |
| **OWASP Agentic**  | [ASI03: Identity & Privilege Abuse](https://owasp.org)                                    |
| **CWE**            | [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html) |
| **CVSS**           | 9.8                                                                                       |
| **Config Default** | `error` (all configs)                                                                     |

## 🔍 What This Rule Detects

This rule identifies hardcoded API keys, tokens, and secrets in your codebase that are used with AI SDK providers. Hardcoded credentials in source code can be exposed through version control, logs, or client bundles.

## ❌ Incorrect Code

```typescript
// Hardcoded OpenAI key
const openai = createOpenAI({
  apiKey: 'sk-proj-abc123xyz789...',
});

// Hardcoded in provider function
const model = openai('gpt-4', {
  apiKey: 'sk-1234567890abcdefghij',
});

// Hardcoded Anthropic key
const anthropic = createAnthropic({
  apiKey: 'sk-ant-api03-abcdefghijklmnop',
});

// Hardcoded Google API key
const google = createGoogle({
  apiKey: 'AIzaSyA1234567890abcdefghij',
});
```

## ✅ Correct Code

```typescript
// Environment variable
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Config object from environment
const anthropic = createAnthropic({
  apiKey: config.anthropicApiKey,
});

// Dynamic retrieval
const google = createGoogle({
  apiKey: getSecret('GOOGLE_API_KEY'),
});

// No explicit key (uses OPENAI_API_KEY env var by default)
const openai = createOpenAI();
```

## ⚙️ Options

| Option         | Type       | Default                                                              | Description                                          |
| -------------- | ---------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| `keyPatterns`  | `string[]` | `['apiKey', 'api_key', 'token', 'secret', 'credential', 'password']` | Property names to check                              |
| `minKeyLength` | `number`   | `20`                                                                 | Minimum string length to consider as a potential key |

## 🛡️ Why This Matters

Hardcoded API keys can be:

- **Exposed in git history** - Even if deleted, keys remain in commit history
- **Leaked in logs** - Stack traces and error messages may expose keys
- **Bundled in client code** - Build processes may include keys in client bundles
- **Shared accidentally** - Code sharing, screenshots, or screen recordings may expose keys

## 🔗 Related Rules

- [`no-sensitive-in-prompt`](./no-sensitive-in-prompt.md) - Prevent sensitive data in prompts

## 📚 References

- [OWASP ASI03: Identity & Privilege Abuse](https://owasp.org)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [Vercel AI SDK Provider Configuration](https://sdk.vercel.ai/docs/ai-sdk-core/providers)
