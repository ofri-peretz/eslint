# `no-sensitive-in-prompt`

> Prevents sensitive data (passwords, tokens, PII) from being sent to LLMs.

## 📊 Rule Details

| Property           | Value                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Type**           | problem                                                                                                                |
| **Severity**       | 🔴 CRITICAL                                                                                                            |
| **OWASP LLM**      | [LLM02: Sensitive Information Disclosure](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **CWE**            | [CWE-200: Information Exposure](https://cwe.mitre.org/data/definitions/200.html)                                       |
| **CVSS**           | 8.5                                                                                                                    |
| **Config Default** | `error` (recommended, strict)                                                                                          |

## 🔍 What This Rule Detects

This rule identifies code patterns where sensitive data like passwords, API keys, tokens, or personally identifiable information (PII) is passed to AI prompts. LLM providers may log, store, or use this data for training.

## ❌ Incorrect Code

```typescript
// Password in prompt
await generateText({
  prompt: `Reset password for user. Current password: ${userPassword}`,
});

// API key in prompt
await generateText({
  prompt: `Configure service with key: ${apiKey}`,
});

// SSN in prompt
await streamText({
  prompt: `Process application for SSN: ${socialSecurityNumber}`,
});

// Credit card in prompt
await generateText({
  prompt: `Validate credit card: ${creditCardNumber}`,
});
```

## ✅ Correct Code

```typescript
// Redacted data
await generateText({
  prompt: `Reset password for user. Current password: [REDACTED]`,
});

// No sensitive data
await generateText({
  prompt: `Configure service with the API key stored in environment variables.`,
});

// Use redaction helper
await streamText({
  prompt: `Process application for SSN: ${redact(socialSecurityNumber)}`,
});

// Reference instead of value
await generateText({
  prompt: `Validate the credit card on file for user ${userId}`,
});
```

## ⚙️ Options

| Option              | Type       | Default                                                                                                                          | Description                                 |
| ------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `sensitivePatterns` | `string[]` | `['password', 'secret', 'token', 'apiKey', 'api_key', 'credential', 'ssn', 'socialSecurity', 'creditCard', 'cvv', 'privateKey']` | Variable patterns suggesting sensitive data |

## 🛡️ Why This Matters

Sending sensitive data to LLMs can result in:

- **Data breach** - LLM providers may store prompts
- **Training data poisoning** - Your data may be used to train models
- **Compliance violations** - GDPR, HIPAA, PCI-DSS violations
- **Third-party exposure** - Data shared with third-party AI providers

## 🔗 Related Rules

- [`no-hardcoded-api-keys`](./no-hardcoded-api-keys.md) - Prevent hardcoded credentials
- [`require-output-filtering`](./require-output-filtering.md) - Filter sensitive tool output

## 📚 References

- [OWASP LLM02: Sensitive Information Disclosure](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-200: Information Exposure](https://cwe.mitre.org/data/definitions/200.html)
