const { tag } = require('../../lib.cjs');
const { program } = require('../../postgresql.cjs');

const CMDS = {
  Begin: "'BEGIN'",
  StartTx: "'START TRANSACTION'",
  Commit: "'COMMIT'",
  Rollback: "'ROLLBACK'",
  Lower: "'begin'",
  Isolation: "'BEGIN ISOLATION LEVEL SERIALIZABLE'",
  TemplateBegin: '`BEGIN`',
  Select: "'SELECT id, name FROM users WHERE id = $1', [id]",
  BeginColumn: "'SELECT begin_at, end_at FROM shifts WHERE id = $1', [id]",
};

const INSERT =
  "await db.query('INSERT INTO users (name) VALUES ($1)', [req.body.name]);";

function code(s) {
  const r = tag(s.receiver);
  const cmd = CMDS[tag(s.cmd)];
  const tx = (q) => `await ${q}(${cmd});\n${INSERT.replace('db.query', q)}`;
  switch (r) {
    case 'SinkBracket':
      return program('Named', tx("pool['query']"));
    case 'Alias':
      return program('Named', `const db = pool;\n${tx('db.query')}`);
    case 'Injected':
      return [
        "import { Pool } from 'pg';",
        'export async function handle(req: any, db: Pool, id: string) {',
        `  ${tx('db.query').split('\n').join('\n  ')}`,
        '}',
        '',
      ].join('\n');
    case 'Client':
      return program(
        'Client',
        `await client.connect();\n${tx('client.query')}`,
        {
          handle: 'client',
        },
      );
    case 'CheckedOut':
      return program(
        'Named',
        `const client = await pool.connect();\ntry {\n  ${tx('client.query').split('\n').join('\n  ')}\n} finally {\n  client.release();\n}`,
      );
    default:
      return program(r, tx('pool.query'));
  }
}

module.exports = {
  rule: 'no-transaction-on-pool',
  domain: 12 * 9,
  traces: 800,
  key: (s) => `${tag(s.receiver)}|${tag(s.cmd)}`,
  code,
};
