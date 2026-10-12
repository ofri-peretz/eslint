// CWE-330: MCP session IDs from a counter and a timestamp
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — the Mcp-Session-Id header is the only thing that ties a
// request to a session, and this generator builds it from the start time and an
// incrementing counter. A client that sees its own ID can compute its neighbours'
// IDs and send requests into their sessions.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

let sessionCount = 0;

function createTransport() {
  return new StreamableHTTPServerTransport({
    sessionIdGenerator: () => `${Date.now()}-${sessionCount++}`,
    enableDnsRebindingProtection: true,
    allowedHosts: ['127.0.0.1:3000'],
  });
}

async function openSession() {
  const server = new McpServer({ name: 'notes', version: '1.0.0' });
  const transport = createTransport();
  await server.connect(transport);
  return transport;
}

module.exports = { openSession };
