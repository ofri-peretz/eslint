# default

Ensure a default export is present, given a default import.

## Rule Details

This rule checks that a default import corresponds to a default export in the imported module.

### ❌ Incorrect

```javascript
// foo.js: export const a = 1;
import foo from './foo';
```

### ✅ Correct

```javascript
// foo.js: export default 1;
import foo from './foo';
```

## LLM Optimization

This rule provides structured error messages with auto-fix instructions for AI assistants.

