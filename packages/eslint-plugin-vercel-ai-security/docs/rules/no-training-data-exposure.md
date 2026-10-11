---
title: no-training-data-exposure
description: This rule identifies code patterns where user data might be sent to LLM training endpoints or when training data coll...
tags: ['security', 'ai']
category: security
severity: medium
cwe: CWE-359
autofix: false
---

> Prevents user data from being sent to LLM training endpoints.


<!-- @rule-summary -->
This rule identifies code patterns where user data might be sent to LLM training endpoints or when training data coll...
<!-- @/rule-summary -->

## 📊 Rule Details

| Property           | Value                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Type**           | problem                                                                                                       |
| **Severity**       | 🟡 HIGH                                                                                                       |
| **OWASP LLM**      | [LLM03: Training Data Poisoning](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **CWE**            | [CWE-359: Privacy Violation](https://cwe.mitre.org/data/definitions/359.html)                                 |
| **CVSS**           | 7.0                                                                                                           |
| **Config Default** | `off` (recommended), `error` (strict)                                                                         |

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

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `trainingPatterns` | `string[]` | `["train","training","finetune","fine-tune","fine_tune"]` | Patterns suggesting training endpoints |

## 🛡️ Why This Matters

Exposing user data to training can:

- **Privacy violations** - User data used without consent
- **Data poisoning** - Malicious data taints model
- **Compliance violations** - GDPR, CCPA violations
- **IP leakage** - Proprietary information exposed

## 🔄 Changes in the 2026-10-10 FP/FN audit

- URLs are matched by whole path segment (`/v1/fine_tuning/jobs`,
  `/api/train/model`), not substring: `/trainers` and `/training-schedule` are
  not reported.
- `feedback`, `improve` and `learn` were removed from the defaults: a
  thumbs-up/down `/api/feedback` endpoint and `showFeedback: true` are product
  features, not training opt-ins. Flag names are matched by whole word.
- Now `off` in `recommended`: the rule has no tie to a provider setting.
- **Options:** the documented `defaultOptions` now apply. Earlier versions read `context.options` and silently ran a shorter hard-coded list instead.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Environment-Based Training Flags

**Why**: Environment variables are not resolved.

```typescript
// ❌ NOT DETECTED - Training from env
const options = { training: process.env.ENABLE_TRAINING };
```

**Mitigation**: Hardcode `training: false`. Never use env for training flags.

### Training Endpoints in Config

**Why**: Endpoints from config files are not visible.

```typescript
// ❌ NOT DETECTED - Endpoint from config
fetch(config.apiEndpoint); // May be fine-tune endpoint
```

**Mitigation**: Review API configurations for training endpoints.

### Implicit Training via SDK Options

**Why**: Hidden SDK options enabling training may not be detected.

```typescript
// ❌ NOT DETECTED - SDK defaults to training
const client = new AIClient(); // training: true by default
```

**Mitigation**: Explicitly set training: false in all SDK configs.

## 📚 References

- [OWASP LLM03: Training Data Poisoning](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-359: Privacy Violation](https://cwe.mitre.org/data/definitions/359.html)