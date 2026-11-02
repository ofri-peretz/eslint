---
'eslint-plugin-vercel-ai-security': patch
---

fix(vercel-ai-security): a renamed SDK import is still the SDK call

Checked against a Quint model of each rule's documented contract (`npm run fidelity`) and by Stryker mutation testing.

- `import { generateText as callModel } from 'ai'` is now recognised by every rule.
- `require-error-handling` does not count `try/finally` or a dropped callback promise as handling.
- `require-validated-prompt` treats `req.query` as user input, and only listed validators as validation.
- `require-tool-confirmation` accepts `confirm: true`.
- `no-system-prompt-leak` catches a system prompt sent through `Response.json` / `res.json`.
