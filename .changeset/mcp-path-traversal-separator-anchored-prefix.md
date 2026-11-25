---
'eslint-plugin-mcp-sdk-security': patch
'oxlint-plugin-mcp-sdk-security': patch
---

`no-path-traversal-in-tool` no longer accepts `target.startsWith(root)` as a containment check unless
the prefix ends at a path separator (`root + path.sep`, `` `${root}/` ``, a literal ending in `/`).
A bare root lets every sibling directory that shares its name through: an allowed `/srv/data` also
admitted `/srv/data-secrets`. This is the bug behind GHSA-hc55-p739-j48w in
`@modelcontextprotocol/server-filesystem` <= 0.6.2, which the rule missed before. An escape test on
a `path.relative` result (`rel.startsWith('..')`) still counts as a check.
