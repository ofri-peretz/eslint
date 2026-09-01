// mcp-sdk-security/require-tool-input-schema — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by mcp-sdk-security/require-tool-input-schema
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
        server.registerTool('read_file', { description: 'Read a file' }, handler);
