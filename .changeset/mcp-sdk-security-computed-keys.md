---
'eslint-plugin-mcp-sdk-security': patch
---

fix: `server['registerTool']` registers the same tool as `.registerTool`

Gates across this plugin compared `property.name` before asking what the
property was, so `o['k']` — the notation minifiers and generated clients
emit — did not reach them. They now resolve through the devkit's
`propertyName` / `objectKeyName`.
