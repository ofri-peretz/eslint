# detect-rag-injection-risks

Detect RAG/document inputs reaching LLM without content scanning.

**OWASP LLM Top 10 2025**: LLM01 - Prompt Injection  
**CWE**: [CWE-74](https://cwe.mitre.org/data/definitions/74.html)  
**Severity**: 🔴 High

## Rule Details

Flags RAG operations and document retrieval without content scanning or Content Disarm and Reconstruction (CDR).

### ❌ Incorrect

```typescript
const docs = await retriever.getRelevantDocuments(query);
await llm.complete(docs);

await vectorStore.addDocuments(documents);
```

### ✅ Correct

```typescript
const safe = await scanDocument(retrievedDoc);
await vectorStore.add(safe);

const clean = await cdr.process(document);
await embeddings.create(clean);
```

## Options

```json
{
  "secure-coding/detect-rag-injection-risks": [
    "error",
    {
      "ragPatterns": ["retriever", "vectorstore", "embedding"],
      "trustedSanitizers": ["scanDocument", "cdr", "contentFilter"]
    }
  ]
}
```

## Version

Introduced in v2.3.0
