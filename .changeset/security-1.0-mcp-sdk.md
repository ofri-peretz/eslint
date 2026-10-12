---
'eslint-plugin-mcp-sdk-security': major
---

feat(mcp-sdk-security)!: 1.0.0, stable MCP SDK security rules checked against real code

1.0 declares the rule set, the rule names, the options and the presets stable. Every rule went through a false-positive/false-negative review against the published 0.x release. That review covered realistic snippets, a scan of real open-source code that uses the library, and a Quint model of each main rule's contract (`benchmarks/quint/`). Every finding was fixed test-first, and nothing was deferred.

An independent review fixed 12 false-negative classes and 5 false-positive classes. Sinks in same-file helpers and `this.method` calls are now followed, and so are handlers bound with `.bind(this)`, Zod `parse`/`safeParse` results, and array and object fields. Prisma, knex and Sequelize raw SQL are now sinks, and `listen(port)` with no host counts as binding every interface. Transports behind a bearer or API-key check, allowlists written with `.some`, fixed-origin URLs and description files shipped beside the server are no longer reported. On 716 MCP files across 15 repos the plugin reports 9 findings, all true positives.

Full audit: `benchmarks/audits/2026-10-12-fp-fn-mcp-sdk-security.md`.

## Migration

No configuration change is needed. Rule names, options and presets are unchanged:

```js
import plugin from 'eslint-plugin-mcp-sdk-security';

export default [plugin.configs.recommended];
```

The fixed false negatives can report code that 0.x missed. Treat a new finding as a real issue, or suppress a single deliberate case with `// eslint-disable-next-line`.
