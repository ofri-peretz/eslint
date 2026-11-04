const { tag } = require('../../lib.cjs');
const { program } = require('../../postgresql.cjs');

const GET = "'SELECT id, name FROM users WHERE id = $1', [id]";
const TOUCH = "'UPDATE users SET seen_at = now() WHERE id = $1', [id]";

const tryFinally = (lines, client = 'client') =>
  [
    'try {',
    ...lines.map((l) => `  ${l}`),
    '} finally {',
    `  ${client}.release();`,
    '}',
  ].join('\n');

const BODIES = {
  Single: (p) =>
    `const client = await ${p}.connect();\n${tryFinally([
      `const result = await client.query(${GET});`,
      'return result.rows[0];',
    ])}`,
  SingleNoTry: (p) =>
    [
      `const client = await ${p}.connect();`,
      `const result = await client.query(${GET});`,
      'client.release();',
      'return result.rows[0];',
    ].join('\n'),
  Bracket: (p) =>
    `const client = await ${p}['connect']();\n${tryFinally([
      `const result = await client['query'](${GET});`,
      'return result.rows[0];',
    ])}`,
  Two: (p) =>
    `const client = await ${p}.connect();\n${tryFinally([
      `const result = await client.query(${GET});`,
      `await client.query(${TOUCH});`,
      'return result.rows[0];',
    ])}`,
  Transaction: (p) =>
    [
      `const client = await ${p}.connect();`,
      'try {',
      "  await client.query('BEGIN');",
      `  await client.query(${TOUCH});`,
      "  await client.query('COMMIT');",
      '} catch (e) {',
      "  await client.query('ROLLBACK');",
      '  throw e;',
      '} finally {',
      '  client.release();',
      '}',
    ].join('\n'),
  PoolDirect: (p) =>
    `const result = await ${p}.query(${GET});\nreturn result.rows[0];`,
};

function code(s) {
  const r = tag(s.receiver);
  const body = BODIES[tag(s.body)];
  if (r === 'Injected') {
    const indented = body('db').split('\n').join('\n  ');
    return `import { Pool } from 'pg';\nexport async function handle(db: Pool, id: string) {\n  ${indented}\n}\n`;
  }
  return program(r, body('pool'));
}

module.exports = {
  rule: 'prefer-pool-query',
  domain: 8 * 6,
  traces: 500,
  key: (s) => `${tag(s.receiver)}|${tag(s.body)}`,
  code,
};
