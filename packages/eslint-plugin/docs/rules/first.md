# first

Ensure all imports appear before other statements.

## Rule Details

This rule enforces that all import statements must appear before other statements in the file.

### ❌ Incorrect

```javascript
import foo from 'foo';
const a = 1;
import bar from 'bar';
```

### ✅ Correct

```javascript
import foo from 'foo';
import bar from 'bar';
const a = 1;
```

## LLM Optimization

This rule provides structured error messages with auto-fix instructions for AI assistants.

