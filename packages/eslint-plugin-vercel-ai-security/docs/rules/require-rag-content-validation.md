# `require-rag-content-validation`

> Requires validation of RAG content before including in AI prompts.

## 📊 Rule Details

| Property           | Value                                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                        |
| **Severity**       | 🟡 MEDIUM                                                                         |
| **OWASP Agentic**  | [ASI07: Poisoned RAG Pipeline](https://owasp.org)                                 |
| **CWE**            | [CWE-74: Improper Neutralization](https://cwe.mitre.org/data/definitions/74.html) |
| **CVSS**           | 6.0                                                                               |
| **Config Default** | `warn` (recommended), `error` (strict)                                            |

## 🔍 What This Rule Detects

This rule identifies code patterns where content retrieved from vector stores or document retrieval systems is used directly in AI prompts without validation.

## ❌ Incorrect Code

```typescript
// Direct vector store results in prompt
const docs = await vectorStore.search(query);
await generateText({
  prompt: `Based on these documents: ${docs}`,
});

// Unvalidated RAG inline
await streamText({
  prompt: `Context: ${await retrieve(query)}`,
});

// Direct search results
const results = await similaritySearch(embedding);
await generateObject({
  prompt: `Use this context: ${results}`,
});
```

## ✅ Correct Code

```typescript
// Validated RAG content
const docs = await vectorStore.search(query);
await generateText({
  prompt: buildPrompt(validateContent(docs)),
});

// Sanitized retrieval
await streamText({
  prompt: `Context: ${sanitize(await retrieve(query))}`,
});

// Filtered results
const docs = await similaritySearch(embedding);
const safeDocs = filterDocs(docs);
await generateObject({
  prompt: buildRAGPrompt(safeDocs),
});
```

## ⚙️ Options

| Option               | Type       | Default                                                                            | Description                         |
| -------------------- | ---------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| `ragPatterns`        | `string[]` | `['search', 'retrieve', 'query', 'vectorStore', 'embeddings', 'similaritySearch']` | Patterns suggesting RAG operations  |
| `validatorFunctions` | `string[]` | `['validate', 'sanitize', 'filter', 'clean', 'verify']`                            | Functions that validate RAG content |

## 🛡️ Why This Matters

Poisoned RAG content can:

- **Inject instructions** - Malicious documents override AI behavior
- **Bypass safety** - Documents contain jailbreak prompts
- **Exfiltrate data** - Documents request sensitive information
- **Spread misinformation** - AI presents false information as fact

## 🔗 Related Rules

- [`require-validated-prompt`](./require-validated-prompt.md) - Validate user prompts
- [`no-dynamic-system-prompt`](./no-dynamic-system-prompt.md) - Static system prompts

## 📚 References

- [OWASP ASI07: Poisoned RAG Pipeline](https://owasp.org)
- [CWE-74: Improper Neutralization](https://cwe.mitre.org/data/definitions/74.html)
