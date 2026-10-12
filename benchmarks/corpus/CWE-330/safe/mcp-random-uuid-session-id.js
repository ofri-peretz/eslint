// CWE-330: Safe — MCP session IDs from the CSPRNG
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — every session ID is a fresh randomUUID() from
// node:crypto (122 random bits), so seeing one ID says nothing about any other.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  StreamableHTTPServerTransport,
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { randomUUID } = require('node:crypto');

function createTransport() {
  return new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
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
