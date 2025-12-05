# named

Ensure named imports correspond to a named export in the remote file.

## Rule Details

This rule checks that named imports exist in the imported module.

### ❌ Incorrect

```javascript
// foo.js: export const a = 1;
import { b } from './foo';
```

### ✅ Correct

```javascript
// foo.js: export const a = 1;
import { a } from './foo';
```

## LLM Optimization

This rule provides structured error messages with auto-fix instructions for AI assistants.

