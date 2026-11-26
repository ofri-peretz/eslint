---
'@interlace/eslint-devkit': minor
'eslint-plugin-node-security': patch
'eslint-plugin-mcp-sdk-security': patch
---

`isSeparatorAnchored` now lives in `@interlace/eslint-devkit`. node-security's file-access rules and mcp-sdk-security's `no-path-traversal-in-tool` each carried their own copy, and the two had to be changed together. Both now import the one shared helper, so a `startsWith` containment guard gets the same verdict from every rule. Rule behaviour does not change.
