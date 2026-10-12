// CWE-089: Safe — MCP tool passes its argument as a bound parameter
// @author      claude-opus-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT be flagged — the SQL text is a literal and `name` travels in
// the values array, which the driver never parses as SQL.
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
      'SELECT id, email FROM users WHERE name = $1',
      [name],
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows) }] };
  },
);

module.exports = { server };
