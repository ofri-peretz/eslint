---
'eslint-plugin-conventions': patch
---

`subagent-declares-model` accepts a subagent that denies the built-in tools that write (`disallowedTools: Edit, Write, Bash`) in place of a `tools` allowlist, for subagents whose MCP tools are not known in advance.
