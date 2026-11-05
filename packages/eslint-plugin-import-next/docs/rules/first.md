# first

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Ensure all imports appear before other statements

## Rule Details

Imports are hoisted: they run before the module body no matter where they are written. Writing them first keeps the file honest about that. This rule reports every import that comes after a statement that is not an import, not only the one right below it.

- An import is `import ... from 'm'`, a side-effect `import 'm'`, and TS `import x = require('m')`.
- The directive prologue (`'use client'`, `'use strict'`, any string directive at the very top) is not a statement of the module body and may come first. A string after an import is no directive: it is an ordinary statement.
- `import x = N.y` aliases a namespace; it loads no module and neither counts as an import nor pushes imports down.

### ❌ Incorrect

```ts
const ready = true;
import a from './a';
import b from './b'; // also after `ready`

import c from './c';
('use client');
import d from './d';
```

### ✅ Correct

```ts
'use client';
'use strict';
import a from './a';
import b = require('./b');

const ready = true;
```

## Options

```json
[]
```

No options.

## When Not To Use It

When a file must run code before an import on purpose; imports are hoisted anyway, so that code does not run first.
