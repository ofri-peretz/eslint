// CWE-918: MCP tool fetches a URL chosen by the tool call
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — `url` comes from the model's tool call, so a
// steered model can make this server request http://169.254.169.254/ or an
// internal admin port and read the answer back.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

const server = new McpServer({ name: 'web', version: '1.0.0' });

server.registerTool(
  'fetch_page',
  {
    description: 'Fetch a web page and return its text',
    inputSchema: { url: z.string().url() },
  },
  async ({ url }) => {
    const response = await fetch(url);
    return { content: [{ type: 'text', text: await response.text() }] };
  },
);

module.exports = { server };
