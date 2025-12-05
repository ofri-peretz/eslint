# extensions

Ensure consistent use of file extensions in imports.

## Rule Details

This rule allows you to configure whether file extensions should be used in imports.

### Options

```json
"extensions": ["error", {
  "pattern": {
    "js": "never",
    "ts": "never",
    "json": "always"
  }
}]
```

### ❌ Incorrect

```javascript
import foo from './foo.js'; // if "js": "never"
import data from './data'; // if "json": "always"
```

### ✅ Correct

```javascript
import foo from './foo';
import data from './data.json';
```

## LLM Optimization

This rule provides structured error messages with auto-fix instructions for AI assistants.

