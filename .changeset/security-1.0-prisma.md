---
'eslint-plugin-prisma-security': major
---

feat(prisma-security)!: 1.0.0, stable Prisma security rules checked against real code

1.0 declares the rule set, the rule names, the options and the presets stable. Every rule went through a false-positive/false-negative review against the published 0.x release. That review covered realistic snippets, a scan of real open-source code that uses the library, and a Quint model of each main rule's contract (`benchmarks/quint/`). Every finding was fixed test-first, and nothing was deferred.

4 false positives and 11 false negatives fixed. Real-code findings went from 11 to 5 true positives. `no-mass-assignment` and `no-unscoped-mutation` no longer depend on the client's name.

Full audit: `benchmarks/audits/2026-10-12-fp-fn-prisma-security.md`.

## Migration

No configuration change is needed. Rule names, options and presets are unchanged:

```js
import plugin from 'eslint-plugin-prisma-security';

export default [plugin.configs.recommended];
```

The fixed false negatives can report code that 0.x missed. Treat a new finding as a real issue, or suppress a single deliberate case with `// eslint-disable-next-line`.
