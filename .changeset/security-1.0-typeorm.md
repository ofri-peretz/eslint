---
'eslint-plugin-typeorm-security': major
---

feat(typeorm-security)!: 1.0.0, stable TypeORM security rules checked against real code

1.0 declares the rule set, the rule names, the options and the presets stable. Every rule went through a false-positive/false-negative review against the published 0.x release. That review covered realistic snippets, a scan of real open-source code that uses the library, and a Quint model of each main rule's contract (`benchmarks/quint/`). Every finding was fixed test-first, and nothing was deferred.

4 false positives and 15 false negatives fixed. The query builder's `where`/`andWhere`/`orWhere`/`having`/`orderBy`/`groupBy`/`select`/joins are covered, and a renamed `Raw` import is still `Raw`.

Full audit: `benchmarks/audits/2026-10-12-fp-fn-typeorm-security.md`.

## Migration

No configuration change is needed. Rule names, options and presets are unchanged:

```js
import plugin from 'eslint-plugin-typeorm-security';

export default [plugin.configs.recommended];
```

The fixed false negatives can report code that 0.x missed. Treat a new finding as a real issue, or suppress a single deliberate case with `// eslint-disable-next-line`.
