# namespace

Ensure imported namespaces contain dereferenced properties as they are dereferenced.

## Rule Details

This rule checks that properties accessed on a namespace import exist in the module.

### ❌ Incorrect

```javascript
import * as foo from './foo';
const x = foo.bar; // if bar is not exported
```

### ✅ Correct

```javascript
import * as foo from './foo';
const x = foo.existingProp;
```

## LLM Optimization

This rule provides structured error messages with auto-fix instructions for AI assistants.

