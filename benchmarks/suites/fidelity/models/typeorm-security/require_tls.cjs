const { tag } = require('../../lib.cjs');
const { TYPEORM, TLS, TLS_URLS } = require('../../orm.cjs');

const MSSQL = {
  TrustTrue: { key: 'trustServerCertificate', expr: 'true' },
  TrustFalse: { key: 'trustServerCertificate', expr: 'false' },
  TrustRuntime: {
    key: 'trustServerCertificate',
    expr: "process.env.DB_TRUST_CERT === '1'",
  },
  EncryptFalse: { key: 'encrypt', expr: 'false' },
  EncryptTrue: { key: 'encrypt', expr: 'true' },
};

const BASE =
  "type: 'postgres', host: 'db.internal', username: 'app', password: process.env.DB_PASSWORD, database: 'app', entities: []";

/** DataSource options with TLS set as the model says. */
function opts(site, name, t) {
  if (name.startsWith('Url'))
    return `{ type: 'postgres', url: ${t.expr}, entities: [] }`;
  const ssl = t.absent ? '' : `, ssl: ${t.expr}`;
  if (site === 'Extra')
    return `{ ${BASE}${t.absent ? '' : `, extra: { ssl: ${t.expr} }`} }`;
  return `{ ${BASE}${ssl} }`;
}

function code(s) {
  const site = tag(s.site);
  const name = tag(s.tls);
  const isUrl = name.startsWith('Url');
  if (site === 'MssqlTop' || site === 'MssqlOptions') {
    const m = MSSQL[name];
    const prop = `${m.key}: ${m.expr}`;
    const o = `{ type: 'mssql', host: 'db.internal', username: 'app', password: process.env.DB_PASSWORD, database: 'app', entities: [], ${site === 'MssqlTop' ? prop : `options: { ${prop} }`} }`;
    return `${TYPEORM.Named.head}\nexport const dataSource = new DataSource(${o});\n`;
  }
  const t = (isUrl ? TLS_URLS : TLS)[name];
  const lines = [t.imports, t.pre];
  const o = opts(site, name, t);
  if (['Named', 'Renamed', 'Require', 'Namespace'].includes(site)) {
    lines.unshift(TYPEORM[site].head);
    lines.push(`export const dataSource = new ${TYPEORM[site].ctor}(${o});`);
  } else if (site === 'Extra' || site === 'InTest') {
    lines.unshift(TYPEORM.Named.head);
    lines.push(`export const dataSource = new DataSource(${o});`);
  } else if (site === 'ConfigVar') {
    lines.unshift(TYPEORM.Named.head);
    lines.push(
      `const options = ${o};`,
      'export const dataSource = new DataSource(options as any);',
    );
  } else if (site === 'OrmConfig') {
    lines.push(`module.exports = ${o};`);
  } else if (site === 'NestForRoot') {
    lines.unshift(
      "import { Module } from '@nestjs/common';",
      "import { TypeOrmModule } from '@nestjs/typeorm';",
    );
    lines.push(
      `@Module({ imports: [TypeOrmModule.forRoot(${o})] })`,
      'export class AppModule {}',
    );
  } else if (site === 'NoImport') {
    lines.unshift('declare function createPool(o: any): any;');
    lines.push(
      `export const pool = createPool(${isUrl ? t.expr : `{ host: 'db.internal', user: 'app', database: 'app'${t.absent ? '' : `, ssl: ${t.expr}`} }`});`,
    );
  } else if (site === 'OtherLib') {
    lines.unshift(TYPEORM.Named.head, "import { Pool } from 'pg';");
    lines.push(
      "export const dataSource = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL, entities: [] });",
      `export const pool = new Pool(${isUrl ? `{ connectionString: ${t.expr} }` : `{ host: 'db.internal', user: 'app', database: 'app'${t.absent ? '' : `, ssl: ${t.expr}`} }`});`,
    );
  } else if (site === 'Bare') {
    lines.unshift(TYPEORM.Named.head);
    lines.push(
      "export const dataSource = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL, entities: [] });",
      `export const agentOptions = { keepAlive: true${t.absent ? '' : `, ssl: ${t.expr}`} };`,
    );
  }
  return lines.filter(Boolean).join('\n') + '\n';
}

module.exports = {
  rule: 'require-tls',
  // 10 sites x 15 + extra and a bare object x 11 + mssql top 3 + options 5
  domain: 10 * 15 + 2 * 11 + 3 + 5,
  traces: 1600,
  key: (s) => `${tag(s.site)}|${tag(s.tls)}`,
  filename: (s) => (tag(s.site) === 'InTest' ? 'src/db.test.ts' : 'src/db.ts'),
  code,
};
