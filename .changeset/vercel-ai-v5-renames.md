---
'eslint-plugin-vercel-ai-security': patch
---

Accept AI SDK v5+ idioms: `stopWhen` (e.g. `stopWhen: stepCountIs(5)`) now satisfies require-max-steps, and `maxOutputTokens` (v5 rename of `maxTokens`) satisfies require-max-tokens — fixing false positives on v5/v7 code.
