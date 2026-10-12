---
'eslint-plugin-mysql-security': major
---

feat(mysql-security)!: 1.0.0, stable mysql2 security rules checked against real code

1.0 declares the rule set, the rule names, the options and the presets stable. Every rule went through a false-positive/false-negative review against the published 0.x release. That review covered realistic snippets, a scan of real open-source code that uses the library, and a Quint model of each main rule's contract (`benchmarks/quint/`). Every finding was fixed test-first, and nothing was deferred.

17 false positives and 12 false negatives fixed. Highlights: an inline allowlist ternary and keyword options composed into a statement are no longer reported; the `{ sql }` options form, renamed handles and `escapeId` placed inside backticks are now caught. On 163 files of real code the rule now reports 20 true positives.

Full audit: `benchmarks/audits/2026-10-12-fp-fn-mysql-security.md`.

## Migration

No configuration change is needed. Rule names, options and presets are unchanged:

```js
import plugin from 'eslint-plugin-mysql-security';

export default [plugin.configs.recommended];
```

The fixed false negatives can report code that 0.x missed. Treat a new finding as a real issue, or suppress a single deliberate case with `// eslint-disable-next-line`.
