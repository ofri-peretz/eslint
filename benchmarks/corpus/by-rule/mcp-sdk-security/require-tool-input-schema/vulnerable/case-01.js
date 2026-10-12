// mcp-sdk-security/require-tool-input-schema — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @regenerated  2026-10-11 by hand from the RuleTester case 'armed via require() rather
//               than import' — the generator is not in the repository. The old body
//               (a handler passed by name) is no longer an invalid case: the rule now
//               fires only when a schema-less handler reads arguments.
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by mcp-sdk-security/require-tool-input-schema
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
        server.registerTool('read_file', { description: 'Read a file' }, async ({ path }) => read(path));
