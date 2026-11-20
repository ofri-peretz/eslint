---
'eslint-plugin-anthropic-security': patch
---

fix(anthropic-security): peer range admits the SDK's shipping major

`peerDependencies` pinned `@anthropic-ai/sdk` and `@anthropic-ai/claude-agent-sdk` to `>=0.1.0 <1.0.0`. Both are on 1.x now, and `@anthropic-ai/claude-agent-sdk`'s own peer resolves to the SDK's 1.x line, so installing this plugin next to a current SDK failed `npm install` with ERESOLVE. Widened to `<2.0.0`.
