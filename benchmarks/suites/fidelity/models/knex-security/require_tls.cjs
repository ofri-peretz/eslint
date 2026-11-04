const { tag } = require('../../lib.cjs');
const { KNEX, TLS, TLS_URLS } = require('../../orm.cjs');

/** A pg connection object with `ssl` set as the model says. */
const CONN = (t) =>
  `{ host: 'db.internal', user: 'app', password: process.env.DB_PASSWORD, database: 'app'${t.absent ? '' : `, ssl: ${t.expr}`} }`;

function code(s) {
  const site = tag(s.site);
  const name = tag(s.tls);
  const isUrl = name.startsWith('Url');
  const t = (isUrl ? TLS_URLS : TLS)[name];
  const conn = isUrl ? t.expr : CONN(t);
  const lines = [t.imports, t.pre];
  const cfg = `{ client: 'pg', connection: ${conn} }`;
  if (
    ['Default', 'Named', 'Renamed', 'Require', 'RequireCall'].includes(site)
  ) {
    lines.unshift(KNEX[site].head);
    lines.push(`export const db = ${KNEX[site].make(cfg)};`);
  } else if (site === 'ConfigVar') {
    lines.unshift(KNEX.Default.head);
    lines.push(`const config = ${cfg};`, 'export const db = knex(config);');
  } else if (site === 'Knexfile') {
    lines.push(`module.exports = { production: ${cfg} };`);
  } else if (site === 'NoImport') {
    lines.unshift('declare function createPool(o: any): any;');
    lines.push(`export const pool = createPool(${conn});`);
  } else if (site === 'OtherLib') {
    lines.unshift(KNEX.Default.head, "import { Pool } from 'pg';");
    lines.push(
      "export const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });",
      `export const pool = new Pool(${isUrl ? `{ connectionString: ${conn} }` : conn});`,
    );
  } else if (site === 'Bare') {
    lines.unshift(KNEX.Default.head);
    lines.push(
      "export const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });",
      `export const agentOptions = { keepAlive: true${t.absent ? '' : `, ssl: ${t.expr}`} };`,
    );
  } else if (site === 'InTest') {
    lines.unshift(KNEX.Default.head);
    lines.push(`export const db = knex(${cfg});`);
  }
  return lines.filter(Boolean).join('\n') + '\n';
}

module.exports = {
  rule: 'require-tls',
  // 10 sites x 15 TLS settings + a bare TLS object x 11
  domain: 10 * 15 + 11,
  traces: 1300,
  key: (s) => `${tag(s.site)}|${tag(s.tls)}`,
  filename: (s) => (tag(s.site) === 'InTest' ? 'src/db.test.ts' : 'src/db.ts'),
  code,
};
