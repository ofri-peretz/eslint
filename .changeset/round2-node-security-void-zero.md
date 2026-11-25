---
'eslint-plugin-node-security': patch
---

`no-timing-unsafe-compare`: a comparison against `void 0` is a comparison against `undefined`, the spelling bundlers and minifiers emit. `meta?.progressToken === void 0` in a bundled MCP server is a presence check, not a secret comparison. `=== undefined` was already silent. A token compared with a configured secret still reports.
