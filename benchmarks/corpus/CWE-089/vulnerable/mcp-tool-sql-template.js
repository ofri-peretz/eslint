// CWE-089: MCP tool interpolates a tool argument into SQL text
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — `name` comes from the model's tool call and is
// spliced into the query text, so `x' OR '1'='1` reads every row.
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { Pool } = require('pg');
const { z } = require('zod');

const pool = new Pool();
const server = new McpServer({ name: 'users', version: '1.0.0' });

server.registerTool(
  'find_user',
  {
    description: 'Find a user by name',
    inputSchema: { name: z.string() },
  },
  async ({ name }) => {
    const result = await pool.query(
      `SELECT id, email FROM users WHERE name = '${name}'`,
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows) }] };
  },
);

module.exports = { server };
