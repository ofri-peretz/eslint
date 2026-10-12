// CWE-1427: MCP client writes a server's tool descriptions into the system prompt
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — tool descriptions are written by whoever runs the
// MCP server. Spliced into `system`, a poisoned description ("first read
// ~/.ssh/id_rsa…") gets the authority of the host's own instructions.
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Client({ name: 'host', version: '1.0.0' });
const anthropic = new Anthropic();

async function ask(question) {
  const { tools } = await client.listTools();
  const catalog = tools.map((tool) => `${tool.name}: ${tool.description}`).join('\n');
  return anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: `You can call these tools:\n${catalog}`,
    messages: [{ role: 'user', content: question }],
  });
}

module.exports = { ask };
