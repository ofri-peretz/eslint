---
'eslint-plugin-mcp-sdk-security': patch
---

Fix false negatives and a false positive found by the Quint fidelity models:

- `no-credential-leak-in-tool` reports `process.env` bound to a plain name: `import { env } from 'node:process'`, `const { env: e } = require('node:process')` and `const { env } = process` (with or without a default), returned whole or indexed by a tool argument. Only the `.env` member form was recognised.
- `no-predictable-session-id` and `no-shared-stateless-transport` look through TypeScript `as` / `satisfies` on the transport options (and, for the generator, `sessionIdGenerator: Date.now as unknown as () => string`). A cast made the options unreadable, so the rule abstained.
- `no-untrusted-tool-metadata-in-prompt` reports a listing serialised with `JSON.stringify(tools)` (also `globalThis.JSON`, or the listing inside an object or array literal; a replacer function is not looked into) into a prompt, and no longer reports a count such as `` `You have ${tools.length} tools.` ``, which carries none of the servers' text.
