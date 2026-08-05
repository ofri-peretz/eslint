---
'eslint-plugin-mcp-sdk-security': minor
---

Add `no-unvalidated-tool-args` (CWE-20).

`require-tool-input-schema` makes sure a schema exists. This rule makes that
schema mean something, by checking the handler only reads keys the schema
declares.

The SDK validates what arrives against the declared shape; nothing checks that
the handler confines itself to the same shape. When it does not, either the
value was stripped — so the handler reads `undefined` and the tool is quietly
broken — or it was not, and the handler is reading raw model-controlled input
that passed no check, while every reviewer assumes the schema covered it.

```ts
server.registerTool('read', { inputSchema: { path: z.string() } },
  async ({ path, encoding }) => readFile(path, encoding));  // `encoding` undeclared
```

Silent for any schema it cannot read — `z.object(…)`, a shared reference, a
spread — because judging a handler against a shape the file does not contain
would report correct code. Also silent for the whole-args form, which would need
the data-flow analysis this rule is built to avoid.
