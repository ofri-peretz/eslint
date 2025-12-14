# require-llm-output-encoding

Require encoding of LLM outputs based on usage context.

**OWASP LLM Top 10 2025**: LLM05 - Improper Output Handling  
**CWE**: [CWE-116](https://cwe.mitre.org/data/definitions/116.html)  
**Severity**: 🔴 Critical

## Rule Details

Enforces proper encoding of LLM outputs before use in HTML, SQL, or other contexts.

### ❌ Incorrect

```typescript
element.innerHTML = llmOutput;
db.query(`SELECT * FROM users WHERE name = '${llmOutput}'`);
```

### ✅ Correct

```typescript
const safe = escapeHTML(llmOutput);
element.innerHTML = safe;

db.query('SELECT * FROM users WHERE name = ?', [llmOutput]);
```

## Options

```json
{
  "secure-coding/require-llm-output-encoding": ["error"]
}
```

## Best Practices

- **HTML**: Use `escapeHTML()` or set `textContent` instead of `innerHTML`
- **SQL**: Use parameterized queries
- **Shell**: Avoid if possible, or use proper escaping

## Version

Introduced in v2.3.0
