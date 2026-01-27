---
title: require-embedding-validation
description: require-embedding-validation
category: security
severity: medium
tags: ['security', 'ai']
autofix: false
---


> Requires validation of embeddings before storage or similarity search.

## 📊 Rule Details

| Property           | Value                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                                                          |
| **Severity**       | 🟡 MEDIUM                                                                                                           |
| **OWASP LLM**      | [LLM08: Vector & Embedding Weaknesses](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **CWE**            | [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)                                 |
| **CVSS**           | 5.5                                                                                                                 |
| **Config Default** | `off` (recommended), `error` (strict)                                                                               |

## 🔍 What This Rule Detects

This rule identifies code patterns where embeddings are stored in vector databases without validation.

## ❌ Incorrect Code

```typescript
// Direct embedding without validation
await vectorStore.upsert({
  id: docId,
  embedding: await embed(text),
});

// Unvalidated createEmbedding
await index.insert({
  vector: await createEmbedding(input),
});
```

## ✅ Correct Code

```typescript
// Validated embedding
await vectorStore.upsert({
  id: docId,
  embedding: validateEmbedding(await embed(text)),
});

// Normalized vector
await index.add({
  vector: normalize(embedding),
});
```

## ⚙️ Options

| Option               | Type       | Default                                      | Description                         |
| -------------------- | ---------- | -------------------------------------------- | ----------------------------------- |
| `embeddingPatterns`  | `string[]` | `['embed', 'embedding', 'vector', 'encode']` | Patterns suggesting embedding calls |
| `validatorFunctions` | `string[]` | `['validate', 'verify', 'normalize']`        | Functions that validate embeddings  |

## 🛡️ Why This Matters

Unvalidated embeddings can:

- **Poison vector stores** - Malicious embeddings return incorrect results
- **Cause DoS** - Invalid dimensions crash indexing
- **Enable jailbreaks** - Crafted embeddings bypass safety
- **Leak information** - Embedding inversion attacks

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Validation in Embedding Function

**Why**: Validation inside called functions is not visible.

```typescript
// ❌ NOT DETECTED - Validation in embed function
await vectorStore.upsert({
  embedding: await safeEmbed(text), // Validates internally
});
```

**Mitigation**: Document validation. Apply rule to embedding functions.

### Custom Vector Store Methods

**Why**: Non-standard methods may not be recognized.

```typescript
// ❌ NOT DETECTED - Custom store method
await myVectorDb.add(embedding); // Not in default patterns
```

**Mitigation**: Configure `embeddingPatterns` with custom method names.

### Batch Embedding Operations

**Why**: Batch operations may obscure individual validations.

```typescript
// ❌ NOT DETECTED - Batch operation
await vectorStore.batchUpsert(embeddings); // Are all validated?
```

**Mitigation**: Validate before batching. Review batch implementations.

## 📚 References

- [OWASP LLM08: Vector & Embedding Weaknesses](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-20 OWASP:A06 CVSS:7.5 | Improper Input Validation detected | HIGH [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A06_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-20](https://cwe.mitre.org/data/definitions/20.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Improper Input Validation detected` |
| **Severity & Compliance** | Impact assessment | `HIGH [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A06_2021-Injection/) |
