const { tag } = require('../../lib.cjs');
const { KNEX, PASSWORDS, CRED_URLS } = require('../../orm.cjs');

const CONN = (pw) =>
  `{ host: 'db.internal', port: 5432, user: 'app', password: ${pw}, database: 'app' }`;

function code(s) {
  const site = tag(s.site);
  const name = tag(s.value);
  const isUrl = name.startsWith('Url');
  const v = (isUrl ? CRED_URLS : PASSWORDS)[name];
  const conn = isUrl ? v.expr : CONN(v.expr);
  const lines = [v.imports, v.pre];
  const spelling = site === 'NoImport' ? undefined : KNEX[site];
  if (site === 'NoImport') {
    // No knex and no knexfile shape: a bare driver-less pool.
    lines.unshift('declare function createPool(o: any): any;');
    lines.push(`export const pool = createPool(${conn});`);
  } else if (spelling) {
    lines.unshift(spelling.head);
    lines.push(
      `export const db = ${spelling.make(`{ client: 'pg', connection: ${conn} }`)};`,
    );
  } else if (site === 'ConfigVar') {
    lines.unshift(KNEX.Default.head);
    lines.push(
      `const config = { client: 'pg', connection: ${conn} };`,
      'export const db = knex(config);',
    );
  } else if (site === 'Knexfile') {
    lines.push(
      `module.exports = { development: { client: 'pg', connection: ${conn} } };`,
    );
  } else if (site === 'OtherLib') {
    lines.unshift(KNEX.Default.head, "import mysql from 'mysql2/promise';");
    lines.push(
      "export const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });",
      `export const pool = mysql.createPool(${conn});`,
    );
  } else if (site === 'InTest') {
    lines.unshift(KNEX.Default.head);
    lines.push(
      `export const db = knex({ client: 'pg', connection: ${conn} });`,
    );
  } else if (site === 'Form') {
    lines.unshift(KNEX.Default.head);
    lines.push(
      "export const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });",
      `export const loginForm = { user: 'alice', password: ${v.expr} };`,
    );
  }
  return lines.filter(Boolean).join('\n') + '\n';
}

module.exports = {
  rule: 'no-hardcoded-credentials',
  // 10 sites x 19 values + a login form x 11 password values
  domain: 10 * 19 + 11,
  traces: 1600,
  key: (s) => `${tag(s.site)}|${tag(s.value)}`,
  filename: (s) => (tag(s.site) === 'InTest' ? 'src/db.test.ts' : 'src/db.ts'),
  code,
};
