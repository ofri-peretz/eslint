const { tag } = require('../../lib.cjs');
const { program } = require('../../postgresql.cjs');

const GET = "'SELECT id, name FROM users WHERE id = $1', [id]";
const INSERT = "'INSERT INTO users (name) VALUES ($1)', [name]";

/** body -> handler statements, given the pool expression. */
const BODIES = {
  NoRelease: (p) => [
    `const client = await ${p}.connect();`,
    `const r = await client.query(${GET});`,
    'return r.rows[0];',
  ],
  EarlyReturnLeak: (p) => [
    `const client = await ${p}.connect();`,
    `const r = await client.query(${GET});`,
    'if (!r.rows.length) return null;',
    'client.release();',
    'return r.rows[0];',
  ],
  CatchOnly: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  const r = await client.query(${GET});`,
    '  return r.rows[0];',
    '} catch (err) {',
    '  client.release();',
    '  throw err;',
    '}',
  ],
  OwnerLends: (p) => [
    `const client = await ${p}.connect();`,
    "await client.query('BEGIN');",
    'await insertUser(client, name);',
    "await client.query('COMMIT');",
  ],
  BracketConnectLeak: (p) => [
    `const client = await ${p}['connect']();`,
    `const r = await client.query(${GET});`,
    'return r.rows[0];',
  ],
  ReleaseFinally: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  const r = await client.query(${GET});`,
    '  return r.rows[0];',
    '} finally {',
    '  client.release();',
    '}',
  ],
  ReleaseAfterTry: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  await client.query(${INSERT});`,
    '} catch (err) {',
    "  console.error('insert failed', err);",
    '}',
    'client.release();',
  ],
  EarlyReturnReleased: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  const r = await client.query(${GET});`,
    '  if (!r.rows.length) {',
    '    client.release();',
    '    return null;',
    '  }',
    '} catch (err) {',
    '  client.release();',
    '  throw err;',
    '}',
    'client.release();',
    'return id;',
  ],
  HandedOff: (p) => [
    `const client = await ${p}.connect();`,
    'return runInTransaction(client, name);',
  ],
  BracketRelease: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  const r = await client.query(${GET});`,
    '  return r.rows[0];',
    '} finally {',
    "  client['release']();",
    '}',
  ],
  ReleaseDestroy: (p) => [
    `const client = await ${p}.connect();`,
    'let broken = false;',
    'try {',
    `  const r = await client.query(${GET});`,
    '  return r.rows[0];',
    '} catch (err) {',
    '  broken = true;',
    '  throw err;',
    '} finally {',
    '  client.release(broken);',
    '}',
  ],
};

const HELPERS = [
  'declare function insertUser(client: unknown, name: string): Promise<void>;',
  'declare function runInTransaction(client: unknown, name: string): Promise<void>;',
].join('\n');

function code(s) {
  const r = tag(s.receiver);
  const lines = BODIES[tag(s.body)];
  const fn = (params, p) =>
    `export async function handle(${params}) {\n${lines(p)
      .map((l) => `  ${l}`)
      .join('\n')}\n}\n`;
  if (r === 'Injected')
    return `import { Pool } from 'pg';\n${HELPERS}\n${fn('db: Pool, id: string, name: string', 'db')}`;
  if (r === 'Duck')
    return `import type { QueryResult } from 'pg';\n${HELPERS}\nexport type Row = QueryResult;\n${fn('db: any, id: string, name: string', 'db')}`;
  return program(r, lines('pool').join('\n'), { pre: HELPERS }).replace(
    '(req: any, res: any, id: string)',
    '(req: any, id: string, name: string)',
  );
}

module.exports = {
  rule: 'no-missing-client-release',
  domain: 9 * 11,
  traces: 700,
  key: (s) => `${tag(s.receiver)}|${tag(s.body)}`,
  code,
};
