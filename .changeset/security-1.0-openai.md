---
'eslint-plugin-openai-security': major
---

feat(openai-security)!: 1.0.0, stable OpenAI SDK security rules checked against real code

1.0 declares the rule set, the rule names, the options and the presets stable. Every rule went through a false-positive/false-negative review against the published 0.x release. That review covered realistic snippets, a scan of real open-source code that uses the library, and a Quint model of each main rule's contract (`benchmarks/quint/`). Every finding was fixed test-first, and nothing was deferred.

Placeholder and example keys are no longer reported as live credentials (601 findings dropped to 0 across 1,037 files of real code). Token-provider and ephemeral-key browser clients and `codeBlock` prompts are recognised as safe. The `developer` role, the Responses API `input`, the Agents SDK, Assistants, `webhookSecret` and `adminAPIKey`, and prompts assembled in consts are now checked.

Full audit: `benchmarks/audits/2026-10-12-fp-fn-openai-security.md`.

## Migration

No configuration change is needed. Rule names, options and presets are unchanged:

```js
import plugin from 'eslint-plugin-openai-security';

export default [plugin.configs.recommended];
```

The fixed false negatives can report code that 0.x missed. Treat a new finding as a real issue, or suppress a single deliberate case with `// eslint-disable-next-line`.
