---
'eslint-plugin-mcp-sdk-security': minor
---

Every rule now runs on files that load the MCP SDK by `require`, `import =` or
`await import`.

```js
const { Server } = require('@modelcontextprotocol/sdk/server/index.js'); // no rule ran
```

The four rules — `no-command-injection-in-tool`,
`no-tool-description-injection`, `no-unvalidated-tool-args` and
`require-tool-input-schema` — each opened their gate from `ImportDeclaration`
plus a bare `require()` callee, which covers ESM and plain CommonJS and nothing
else. They now share one `mcp-evidence` probe built on the devkit module gate,
so every spelling is recognised in one place rather than four.

A `module-gate.lock.test.ts` pins it: the same tool definition must report
identically however the SDK was brought in.
