// CWE-1427: Safe — MCP client passes server tools through the tools parameter
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — the server's tool metadata goes in `tools`, the
// channel the model reads as tool documentation and the host can pin and
// review; the system prompt stays a literal the host owns.
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Client({ name: 'host', version: '1.0.0' });
const anthropic = new Anthropic();

async function ask(question) {
  const { tools } = await client.listTools();
  return anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: 'You are a careful assistant. Use tools only when needed.',
    messages: [{ role: 'user', content: question }],
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    })),
  });
}

module.exports = { ask };
