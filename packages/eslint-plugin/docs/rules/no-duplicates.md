# no-duplicates

Reports duplicate imports.

## Rule Details

This rule reports duplicate imports from the same module.

### ❌ Incorrect

```javascript
import { merge } from 'lodash';
import { find } from 'lodash';
```

### ✅ Correct

```javascript
import { merge, find } from 'lodash';
```

## LLM Optimization

This rule provides structured error messages with auto-fix instructions for AI assistants.

