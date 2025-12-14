# no-user-controlled-prompt-instructions

Prevent user input from controlling LLM instructions or behavior.

**OWASP LLM Top 10 2025**: LLM01 - Prompt Injection  
**CWE**: [CWE-73](https://cwe.mitre.org/data/definitions/73.html)  
**Severity**: 🔴 High

## Rule Details

Flags cases where user input directly controls LLM behavior, mode, or instructions.

### ❌ Incorrect

```typescript
instructions = req.body.instructions;
behavior = userBehavior;
mode = req.query.mode;
```

### ✅ Correct

```typescript
const ALLOWED_MODES = ['helpful', 'concise'];
if (!ALLOWED_MODES.includes(userMode)) throw Error();
mode = userMode;

behavior = SYSTEM_BEHAVIORS.default;
```

## Options

```json
{
  "secure-coding/no-user-controlled-prompt-instructions": ["error"]
}
```

## Best Practices

Use allowlists for user-selectable behaviors rather than accepting arbitrary instructions.

## Version

Introduced in v2.3.0
