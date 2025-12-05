# newline-after-import

Enforce a newline after import statements.

## Rule Details

This rule enforces a newline after the last import statement in a block of imports.

### ❌ Incorrect

```javascript
import foo from 'foo';
const a = 1;
```

### ✅ Correct

```javascript
import foo from 'foo';

const a = 1;
```

## LLM Optimization

This rule provides structured error messages with auto-fix instructions for AI assistants.

