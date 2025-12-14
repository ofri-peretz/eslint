# detect-llm-generated-sql

Detect dangerous LLM-to-SQL patterns.

**OWASP LLM Top 10 2025**: LLM05 - Improper Output Handling  
**CWE**: [CWE-89](https://cwe.mitre.org/data/definitions/89.html)  
**Severity**: 🔴 Critical

## Rule Details

Identifies LLM-generated SQL being executed directly without validation.

### ❌ Incorrect

```typescript
await db.query(llmSQL);
await db.execute(llmQuery);
await db.raw(generatedSQL);
```

### ✅ Correct

```typescript
// Use ORM
const users = await User.findAll();

// Validate SQL
const validated = validateSQL(llmQuery, allowedTables);
await db.query(validated);
```

## Options

```json
{
  "secure-coding/detect-llm-generated-sql": ["error"]
}
```

## Best Practices

1. **Use ORM** (Prisma, TypeORM, Sequelize)
2. **Validate SQL structure** against allowlist
3. **Parse and analyze** SQL AST before execution

## Version

Introduced in v2.3.0
