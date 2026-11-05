# newline-after-import

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
🔧 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Enforce a newline after import statements

## Rule Details

A blank line between the imports and the code that follows them separates a file's dependencies from its body. This rule reports an import statement whose next statement is not an import and starts on the same line or the very next line. The fix inserts the blank line.

- Import statements are `import ... from 'm'` (also `import type`) and TS `import x = require('m')`; consecutive ones form one block, and only the last needs the blank line.
- The end of the file needs nothing after the last import.
- A comment does not count as code: an import followed by a comment line and then code has its separating line.

Top-level `require()` calls are not import statements and are not checked.

### ❌ Incorrect

```ts
import a from './a';
const b = a();

import c = require('./c');
export const d = c;
```

### ✅ Correct

```ts
import a from './a';
import c = require('./c');

const b = a();
```

## Options

```json
[]
```

No options.

## When Not To Use It

When your formatter already enforces blank lines after imports.
