const { tag } = require('../../lib.cjs');
const { program } = require('../../postgresql.cjs');

const INSERT = "'INSERT INTO users (id, name) VALUES ($1, $2)'";

/** shape -> handler body, given the receiver `h`. */
const SHAPES = {
  ForOfInsert: (h) =>
    `for (const user of users) {\n  await ${h}.query(${INSERT}, [user.id, user.name]);\n}`,
  ForIndexUpdate: (h) =>
    `for (let i = 0; i < users.length; i++) {\n  await ${h}.query('UPDATE users SET active = true WHERE id = $1', [users[i].id]);\n}`,
  WhileDelete: (h) =>
    `let i = 0;\nwhile (i < users.length) {\n  await ${h}.query('DELETE FROM sessions WHERE user_id = $1', [users[i].id]);\n  i++;\n}`,
  ForEachUpdate: (h) =>
    `users.forEach(async (user) => {\n  await ${h}.query('UPDATE users SET active = true WHERE id = $1', [user.id]);\n});`,
  MapInsert: (h) =>
    `await Promise.all(users.map((user) => ${h}.query(${INSERT}, [user.id, user.name])));`,
  ArrayFromInsert: (h) =>
    `const writes = Array.from(users, (u) => ${h}.query(${INSERT}, [u.id, u.name]));\nawait Promise.all(writes);`,
  BracketInLoop: (h) =>
    `for (const user of users) {\n  await ${h}['query'](${INSERT}, [user.id, user.name]);\n}`,
  MapSelect: (h) =>
    `return Promise.all(users.map((u) => ${h}.query('SELECT id, name FROM users WHERE id = $1', [u.id])));`,
  UnnestBulk: (h) =>
    `await ${h}.query(\n  'INSERT INTO users (id, name) SELECT * FROM unnest($1::int[], $2::text[])',\n  [users.map((u) => u.id), users.map((u) => u.name)],\n);`,
  ChunkedUnnest: (h) =>
    `for (const chunk of chunks(users, 500)) {\n  await ${h}.query(\n    'INSERT INTO users (id, name) SELECT * FROM unnest($1::int[], $2::text[])',\n    [chunk.map((u) => u.id), chunk.map((u) => u.name)],\n  );\n}`,
  MigrationRunner: (h) =>
    `for (const file of migrationFiles) {\n  await ${h}.query(readFileSync(file, 'utf8'));\n}`,
  NoParamsRepeat: (h) =>
    `for (const _ of users) {\n  await ${h}.query('REFRESH MATERIALIZED VIEW user_stats');\n}`,
  SingleInsert: (h) =>
    `const [first] = users;\nawait ${h}.query(${INSERT}, [first.id, first.name]);`,
};

const PRE = [
  "import { readFileSync } from 'node:fs';",
  'type User = { id: number; name: string };',
  'declare const users: User[];',
  'declare const migrationFiles: string[];',
  'declare function chunks<T>(xs: T[], n: number): T[][];',
].join('\n');

function code(s) {
  const d = tag(s.driver);
  const handle = d === 'Client' ? 'client' : 'pool';
  return program(d, SHAPES[tag(s.shape)](handle), { handle, pre: PRE });
}

module.exports = {
  rule: 'no-batch-insert-loop',
  domain: 8 * 13,
  traces: 700,
  key: (s) => `${tag(s.driver)}|${tag(s.shape)}`,
  code,
};
