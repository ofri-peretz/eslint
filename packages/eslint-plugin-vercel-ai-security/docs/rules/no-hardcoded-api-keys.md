---
title: no-hardcoded-api-keys
description: This rule identifies hardcoded API keys, tokens, and secrets in your codebase that are used with AI SDK providers
tags: ['security', 'ai']
category: security
severity: critical
cwe: CWE-798
autofix: false
---

> Detects hardcoded API keys and secrets in AI SDK configuration.


<!-- @rule-summary -->
This rule identifies hardcoded API keys, tokens, and secrets in your codebase that are used with AI SDK providers
<!-- @/rule-summary -->

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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Keys from Variables

**Why**: Keys stored in variables are not analyzed.

```typescript
// ❌ NOT DETECTED - Key from variable
const apiKey = 'sk-proj-abc123xyz789...';
const openai = createOpenAI({ apiKey });
```

**Mitigation**: Use environment variables directly. Never store keys in variables.

### Encoded/Obfuscated Keys

**Why**: Base64 or other encoded keys are not decoded.

```typescript
// ❌ NOT DETECTED - Encoded key
const key = Buffer.from('c2stcHJvai1hYmM...', 'base64').toString();
const openai = createOpenAI({ apiKey: key });
```

**Mitigation**: Never obfuscate keys. Use proper secrets management.

### Keys from Config Files

**Why**: Keys imported from config files are not visible.

```typescript
// ❌ NOT DETECTED - Key from import
import { apiKeys } from './config';
const openai = createOpenAI({ apiKey: apiKeys.openai });
```

**Mitigation**: Apply rule to config files. Use environment variables.

### Template Literal Construction

**Why**: Keys built from parts may not be recognized.

```typescript
// ❌ NOT DETECTED - Constructed key
const openai = createOpenAI({
  apiKey: `sk-${projectId}-${keyPart}`,
});
```

**Mitigation**: Never construct keys dynamically.

## 📚 References

- [OWASP ASI03: Identity & Privilege Abuse](https://owasp.org)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [Vercel AI SDK Provider Configuration](https://sdk.vercel.ai/docs/ai-sdk-core/providers)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-798 OWASP:A04 CVSS:9.8 | Hardcoded Credentials detected | CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A04_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) CVSS Score |
| **Issue Description** | Specific vulnerability | `Hardcoded Credentials detected` |
| **Severity & Compliance** | Impact assessment | `CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001,NIST-CSF]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/) |