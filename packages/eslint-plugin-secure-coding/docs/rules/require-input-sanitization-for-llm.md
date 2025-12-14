# require-input-sanitization-for-llm

Enforce input sanitization before LLM API calls.

**OWASP LLM Top 10 2025**: LLM01 - Prompt Injection  
**CWE**: [CWE-20](https://cwe.mitre.org/data/definitions/20.html)  
**Severity**: 🔴 High

## Rule Details

Requires all user input to be sanitized before being passed to LLM APIs.

### ❌ Incorrect

```typescript
await llm.complete(userInput);
await llm.chat(req.body.input);
```

### ✅ Correct

```typescript
const clean = sanitizeInput(userInput);
await llm.complete(clean);

const validated = validateInput(userQuery);
await llm.chat(validated);
```

## Options

```json
{
  "secure-coding/require-input-sanitization-for-llm": [
    "error",
    {
      "trustedSanitizers": ["sanitizeInput", "validateInput", "promptGuard"]
    }
  ]
}
```

## Version

Introduced in v2.3.0
