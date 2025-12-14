# `no-training-data-exposure`

> Prevents user data from being sent to LLM training endpoints.

## 📊 Rule Details

| Property           | Value                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Type**           | problem                                                                                                       |
| **Severity**       | 🟡 HIGH                                                                                                       |
| **OWASP LLM**      | [LLM03: Training Data Poisoning](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **CWE**            | [CWE-359: Privacy Violation](https://cwe.mitre.org/data/definitions/359.html)                                 |
| **CVSS**           | 7.0                                                                                                           |
| **Config Default** | `warn` (recommended), `error` (strict)                                                                        |

## 🔍 What This Rule Detects

This rule identifies code patterns where user data might be sent to LLM training endpoints or when training data collection is enabled.

## ❌ Incorrect Code

```typescript
// Training enabled
const config = {
  training: true,
};

// Allow training flag
const options = {
  allowTraining: true,
};

// Training endpoint
fetch('https://api.openai.com/v1/fine-tune');
```

## ✅ Correct Code

```typescript
// Training disabled
const config = {
  training: false,
};

// No training endpoint
await generateText({
  model: openai('gpt-4'),
  prompt: userInput,
});
```

## ⚙️ Options

| Option             | Type       | Default                                         | Description                  |
| ------------------ | ---------- | ----------------------------------------------- | ---------------------------- |
| `trainingPatterns` | `string[]` | `['train', 'training', 'finetune', 'feedback']` | Patterns suggesting training |

## 🛡️ Why This Matters

Exposing user data to training can:

- **Privacy violations** - User data used without consent
- **Data poisoning** - Malicious data taints model
- **Compliance violations** - GDPR, CCPA violations
- **IP leakage** - Proprietary information exposed

## 📚 References

- [OWASP LLM03: Training Data Poisoning](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-359: Privacy Violation](https://cwe.mitre.org/data/definitions/359.html)
