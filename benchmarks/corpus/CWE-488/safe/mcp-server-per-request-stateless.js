// CWE-488: Safe — stateless Streamable HTTP with a server and transport per request
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — the SDK's stateless pattern: a same-file factory builds
// a fresh McpServer for every request, it is connected to a fresh stateless
// transport, and both are closed when the response closes, so no two clients ever
// share a server or a transport.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

function getServer() {
  return new McpServer({ name: 'accounts', version: '1.0.0' });
}

async function handleMcpRequest(req, res, body) {
  const server = getServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableDnsRebindingProtection: true,
    allowedHosts: ['127.0.0.1:3000'],
  });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

module.exports = { handleMcpRequest };
