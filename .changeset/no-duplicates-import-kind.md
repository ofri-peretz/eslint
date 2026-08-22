---
'eslint-plugin-import-next': patch
---

`no-duplicates`: a type-only import is not a duplicate of a value import.

The rule grouped imports by module specifier alone, so

```ts
import type { ActiveConfig } from '../project/active-config.js';
import { selectActiveConfig } from '../project/active-config.js';
```

was reported as a duplicate. It is not. The type-only form is erased at compile
time, so folding it into the value import creates a runtime dependency that was
not there — which is what `verbatimModuleSyntax` exists to prevent and what
tree-shaking relies on. The two declarations are separate on purpose.

Grouping is now keyed by specifier **and** `importKind`, matching ESLint core's
`import/no-duplicates`. Two type-only imports from the same module are still
duplicates of each other and still merge.

On the pinned 8-repository corpus: **94 → 40 findings**.
