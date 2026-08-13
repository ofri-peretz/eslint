---
'eslint-plugin-gemini-security': patch
---

`no-disabled-safety-settings` now runs on files that load the Gemini SDK by
`require`, `import =` or `await import`.

```js
const { GoogleGenerativeAI } = require('@google/generative-ai'); // rule did not run
```

The gate read `ImportDeclaration` and a bare `require()` callee and nothing
else, so a `BLOCK_NONE` safety setting in a CommonJS file was never reported.
It now goes through the shared devkit module probe, and a
`module-gate.lock.test.ts` pins that the verdict does not depend on the
spelling.
