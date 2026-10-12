// CWE-346: MCP Streamable HTTP transport with DNS-rebinding protection left off
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — the transport is built without
// `enableDnsRebindingProtection: true` and `allowedHosts`, and nothing in the file
// validates the Host header, so a web page the user opens can rebind its own
// hostname to 127.0.0.1 and call this local server's tools as a same-origin peer.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

async function handleMcpRequest(req, res, body) {
  const server = new McpServer({ name: 'local-files', version: '1.0.0' });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

module.exports = { handleMcpRequest };
