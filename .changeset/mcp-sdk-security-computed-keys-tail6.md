---
'eslint-plugin-mcp-sdk-security': patch
---

fix: `server['registerTool'](…)` registers the same tool

`require-tool-input-schema` matched the registration on `property.name`, so a
subscripted registerTool skipped the input-schema requirement.
