---
'eslint-plugin-mcp-sdk-security': patch
---

fix(mcp-sdk-security): no longer declares `@modelcontextprotocol/sdk`, `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `@modelcontextprotocol/core`, `@modelcontextprotocol/node`, `@modelcontextprotocol/express`, `@modelcontextprotocol/hono`, `@modelcontextprotocol/fastify`, `@modelcontextprotocol/server-legacy` as optional `peerDependencies`

No source file ever imported them; the rules match the library by the import specifier in the linted code, so nothing needs installing. The entries only made npm warn on a version mismatch. The supported ranges are now listed in the README under "Supported library versions". Nothing changes at lint time. If you installed the plugin next to these libraries and relied on npm's peer warning, that warning is gone.
