// CWE-078: Safe — MCP client maps a requested server name through a fixed allowlist
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — the caller only chooses a key; the command and the
// package each server runs are literals the code owns, and an unknown key is
// rejected before anything is spawned.
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const SERVERS = {
  git: { command: 'uvx', args: ['mcp-server-git'] },
  time: { command: 'uvx', args: ['mcp-server-time'] },
};

async function connectServer(requested) {
  if (!Object.hasOwn(SERVERS, requested)) {
    throw new Error('Unknown MCP server');
  }
  const { command, args } = SERVERS[requested];
  const transport = new StdioClientTransport({ command, args: [...args] });
  const client = new Client({ name: `proxy-${requested}`, version: '1.0.0' });
  await client.connect(transport);
  return client;
}

module.exports = { connectServer };
