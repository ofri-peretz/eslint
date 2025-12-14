# `require-embedding-validation`

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

## 📚 References

- [OWASP LLM08: Vector & Embedding Weaknesses](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
