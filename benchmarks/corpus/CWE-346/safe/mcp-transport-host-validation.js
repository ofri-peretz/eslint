// CWE-346: Safe — MCP Streamable HTTP transport validates the Host header
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — the transport turns on DNS-rebinding protection with
// an explicit allowlist of the Host header values clients send (port included),
// so a request carrying an attacker's rebound hostname is answered 403.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

async function handleMcpRequest(req, res, body) {
  const server = new McpServer({ name: 'local-files', version: '1.0.0' });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableDnsRebindingProtection: true,
    allowedHosts: ['127.0.0.1:3000', 'localhost:3000'],
  });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

module.exports = { handleMcpRequest };
