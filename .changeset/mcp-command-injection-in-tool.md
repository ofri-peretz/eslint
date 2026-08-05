---
'eslint-plugin-mcp-sdk-security': minor
---

Add `no-command-injection-in-tool` (CWE-78).

A tool handler's parameter is attacker-influenced by construction: it is filled
from the model's tool call, and the model can be steered by any content it has
read. When that value names the command, whoever steers the model chooses what
runs on the host.

```ts
server.registerTool('run', cfg, async ({ cmd }) => { execSync(cmd); });
```

This fills a gap `node-security/no-shell-injection` declines by design — its
own header says it "does NOT fire on `exec(variable)` — indirect; data-flow
analysis required, out of scope". Inside a tool handler that analysis is not
needed, because the taint source is the handler's own parameter, declared in
the same expression.

The two rules split by shape, and the split is what keeps them off the same
line: the concatenated form stays with `no-shell-injection` and is deliberately
silent here.

Also registers `eslint-plugin-mcp-sdk-security` in `PLUGIN_ALLOWED_ENVIRONMENTS`
as `['mcp']`, and derives the plugin's `strict` preset from `Object.keys(rules)`
instead of the hand-written list it had.
