---
'eslint-plugin-anthropic-security': major
---

feat(anthropic-security)!: 1.0.0, stable Anthropic SDK security rules checked against real code

1.0 declares the rule set, the rule names, the options and the presets stable. Every rule went through a false-positive/false-negative review against the published 0.x release. That review covered realistic snippets, a scan of real open-source code that uses the library, and a Quint model of each main rule's contract (`benchmarks/quint/`). Every finding was fixed test-first, and nothing was deferred.

Placeholder and example keys are no longer reported as live credentials (345 findings dropped to 0 on Anthropic's own examples). Calls that are not the SDK client, a browser flag paired with a per-session credential, and static or cached prompts are now recognised as safe. A key or options object held in a const, the Bedrock, Vertex and webhook credentials, prompts assembled in consts, and the `parse`, `toolRunner` and batches APIs are now checked.

Full audit: `benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md`.

## Migration

No configuration change is needed. Rule names, options and presets are unchanged:

```js
import plugin from 'eslint-plugin-anthropic-security';

export default [plugin.configs.recommended];
```

The fixed false negatives can report code that 0.x missed. Treat a new finding as a real issue, or suppress a single deliberate case with `// eslint-disable-next-line`.
