const { tag } = require('../../lib.cjs');
const { program } = require('../../postgresql.cjs');

const GET = "'SELECT id, name FROM users WHERE id = $1', [id]";
const Q = `await client.query(${GET});`;

/** body -> handler lines, given the pool expression `p`. */
const BODIES = {
  SameBlock: (p) => [
    `const client = await ${p}.connect();`,
    Q,
    'client.release();',
    'client.release();',
  ],
  CatchFinally: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  ${Q}`,
    '} catch (e) {',
    '  client.release();',
    '  throw e;',
    '} finally {',
    '  client.release();',
    '}',
  ],
  TryFinally: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  ${Q}`,
    '  client.release();',
    '} finally {',
    '  client.release();',
    '}',
  ],
  FinallyAfter: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  ${Q}`,
    '} finally {',
    '  client.release();',
    '}',
    'client.release();',
  ],
  TryAfter: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  ${Q}`,
    '  client.release();',
    '} catch (e) {',
    "  console.error('query failed', e);",
    '}',
    'client.release();',
  ],
  SwitchFallthrough: (p) => [
    `const client = await ${p}.connect();`,
    Q,
    'switch (kind) {',
    "  case 'a':",
    '    client.release();',
    "  case 'b':",
    '    client.release();',
    '    break;',
    '}',
  ],
  TernarySequential: (p) => [
    `const client = await ${p}.connect();`,
    Q,
    'done ? client.release() : null;',
    'client.release();',
  ],
  ShortCircuitSequential: (p) => [
    `const client = await ${p}.connect();`,
    Q,
    'done && client.release();',
    'client.release();',
  ],
  Destructured: (p) => [
    `const { query, release } = await ${p}.connect();`,
    `await query(${GET});`,
    'release();',
    'release();',
  ],
  BracketTwice: (p) => [
    `const client = await ${p}.connect();`,
    Q,
    "client['release']();",
    "client['release']();",
  ],
  SingleFinally: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  ${Q}`,
    '} catch (e) {',
    '  throw e;',
    '} finally {',
    '  client.release();',
    '}',
  ],
  Guarded: (p) => [
    `const client = await ${p}.connect();`,
    'let released = false;',
    'const safeRelease = () => {',
    '  if (!released) {',
    '    released = true;',
    '    client.release();',
    '  }',
    '};',
    'try {',
    `  return await client.query(${GET});`,
    '} finally {',
    '  safeRelease();',
    '}',
  ],
  IfElse: (p) => [
    `const client = await ${p}.connect();`,
    Q,
    'if (done) {',
    '  client.release();',
    '} else {',
    '  client.release();',
    '}',
  ],
  EarlyReturn: (p) => [
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
  CatchRethrowAfter: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  ${Q}`,
    '} catch (err) {',
    '  client.release();',
    '  throw err;',
    '}',
    'client.release();',
  ],
  TryEndPlusCatch: (p) => [
    `const client = await ${p}.connect();`,
    'try {',
    `  ${Q}`,
    '  client.release();',
    '} catch (err) {',
    '  client.release();',
    "  console.error('query failed', err);",
    '}',
  ],
  RetryLoop: (p) => [
    'for (let attempt = 0; attempt < 3; attempt++) {',
    `  const client = await ${p}.connect();`,
    '  try {',
    `    return await client.query(${GET});`,
    '  } catch (err) {',
    '    if (attempt === 2) throw err;',
    '  } finally {',
    '    client.release();',
    '  }',
    '}',
  ],
};

function code(s) {
  const r = tag(s.receiver);
  const lines = BODIES[tag(s.body)];
  const params = 'id: string, kind: string, done: boolean';
  if (r === 'Injected') {
    const body = lines('db')
      .map((l) => `  ${l}`)
      .join('\n');
    return `import { Pool } from 'pg';\nexport async function handle(db: Pool, ${params}) {\n${body}\n}\n`;
  }
  return program(r, lines('pool').join('\n')).replace(
    '(req: any, res: any, id: string)',
    `(${params})`,
  );
}

module.exports = {
  rule: 'prevent-double-release',
  domain: 8 * 17,
  traces: 900,
  key: (s) => `${tag(s.receiver)}|${tag(s.body)}`,
  code,
};
