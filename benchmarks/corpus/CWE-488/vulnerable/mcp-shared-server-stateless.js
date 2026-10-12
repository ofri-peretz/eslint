// CWE-488: One McpServer shared by every request in stateless Streamable HTTP mode
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — CVE-2026-25536. The transport is stateless
// (`sessionIdGenerator: undefined`) and built per request, but the McpServer it is
// connected to is built once at module level. Concurrent clients number their
// JSON-RPC requests from the same small integers, so one client's tool result can
// be written to another client's response.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

const server = new McpServer({ name: 'accounts', version: '1.0.0' });

async function handleMcpRequest(req, res, body) {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableDnsRebindingProtection: true,
    allowedHosts: ['127.0.0.1:3000'],
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

module.exports = { handleMcpRequest };
