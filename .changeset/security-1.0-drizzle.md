---
'eslint-plugin-drizzle-security': major
---

feat(drizzle-security)!: 1.0.0, stable Drizzle security rules checked against real code

1.0 declares the rule set, the rule names, the options and the presets stable. Every rule went through a false-positive/false-negative review against the published 0.x release. That review covered realistic snippets, a scan of real open-source code that uses the library, and a Quint model of each main rule's contract (`benchmarks/quint/`). Every finding was fixed test-first, and nothing was deferred.

12 false positives and 9 false negatives fixed. Real-code findings dropped from 603 to 10 true positives, and a `sql` tag imported under another name is still checked.

Full audit: `benchmarks/audits/2026-10-12-fp-fn-drizzle-security.md`.

## Migration

No configuration change is needed. Rule names, options and presets are unchanged:

```js
import plugin from 'eslint-plugin-drizzle-security';

export default [plugin.configs.recommended];
```

The fixed false negatives can report code that 0.x missed. Treat a new finding as a real issue, or suppress a single deliberate case with `// eslint-disable-next-line`.
