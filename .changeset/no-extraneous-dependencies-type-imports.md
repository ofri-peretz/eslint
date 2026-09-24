---
'eslint-plugin-import-next': patch
---

`no-extraneous-dependencies` no longer reports type-only imports. `import type { X } from 'pkg'` and `import { type X } from 'pkg'` are erased at compile time, so they cannot pull in a runtime dependency, and upstream ignores them by default. The rule used to report them as a missing dependency and suggest `npm install` of the wrong package (`mdx` for `mdx/types`, which `@types/mdx` satisfies). An import that also binds a value, or a bare side-effect import, is still checked.
