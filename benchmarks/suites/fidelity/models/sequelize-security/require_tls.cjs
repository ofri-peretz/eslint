const { tag } = require('../../lib.cjs');
const { SEQUELIZE, TLS, TLS_URLS } = require('../../orm.cjs');

/** Sequelize options with `dialectOptions.ssl` set as the model says. */
const OPTS = (t) =>
  `{ dialect: 'postgres', host: 'db.internal', username: 'app', password: process.env.DB_PASSWORD, database: 'app'${t.absent ? '' : `, dialectOptions: { ssl: ${t.expr} }`} }`;

function code(s) {
  const site = tag(s.site);
  const name = tag(s.tls);
  const isUrl = name.startsWith('Url');
  const t = (isUrl ? TLS_URLS : TLS)[name];
  const lines = [t.imports, t.pre];
  const ctorArgs = isUrl ? `${t.expr}, { dialect: 'postgres' }` : OPTS(t);
  if (['Named', 'Default', 'Require', 'Renamed', 'Typescript'].includes(site)) {
    lines.unshift(SEQUELIZE[site].head);
    lines.push(
      `export const sequelize = new ${SEQUELIZE[site].ctor}(${ctorArgs});`,
    );
  } else if (site === 'ConfigVar') {
    lines.unshift(SEQUELIZE.Named.head);
    lines.push(
      isUrl
        ? `const url = ${t.expr};\nexport const sequelize = new Sequelize(url, { dialect: 'postgres' });`
        : `const options = ${OPTS(t)};\nexport const sequelize = new Sequelize(options as any);`,
    );
  } else if (site === 'CliConfig') {
    const env = isUrl ? `{ dialect: 'postgres', url: ${t.expr} }` : OPTS(t);
    lines.push(`module.exports = { production: ${env} };`);
  } else if (site === 'NestForRoot') {
    lines.unshift(
      "import { Module } from '@nestjs/common';",
      "import { SequelizeModule } from '@nestjs/sequelize';",
    );
    const opts = isUrl ? `{ dialect: 'postgres', uri: ${t.expr} }` : OPTS(t);
    lines.push(
      `@Module({ imports: [SequelizeModule.forRoot(${opts})] })`,
      'export class AppModule {}',
    );
  } else if (site === 'NoImport') {
    lines.unshift('declare function createPool(o: any): any;');
    lines.push(
      `export const pool = createPool(${isUrl ? t.expr : `{ host: 'db.internal', user: 'app', database: 'app'${t.absent ? '' : `, ssl: ${t.expr}`} }`});`,
    );
  } else if (site === 'OtherLib') {
    lines.unshift(SEQUELIZE.Named.head, "import { Pool } from 'pg';");
    lines.push(
      "export const sequelize = new Sequelize(process.env.DATABASE_URL as string, { dialect: 'postgres' });",
      `export const pool = new Pool(${isUrl ? `{ connectionString: ${t.expr} }` : `{ host: 'db.internal', user: 'app', database: 'app'${t.absent ? '' : `, ssl: ${t.expr}`} }`});`,
    );
  } else if (site === 'Bare') {
    lines.unshift(SEQUELIZE.Named.head);
    lines.push(
      "export const sequelize = new Sequelize(process.env.DATABASE_URL as string, { dialect: 'postgres' });",
      `export const agentOptions = { keepAlive: true${t.absent ? '' : `, ssl: ${t.expr}`} };`,
    );
  } else if (site === 'InTest') {
    lines.unshift(SEQUELIZE.Named.head);
    lines.push(`export const sequelize = new Sequelize(${ctorArgs});`);
  }
  return lines.filter(Boolean).join('\n') + '\n';
}

module.exports = {
  rule: 'require-tls',
  // 11 sites x 15 TLS settings + a bare TLS object x 11
  domain: 11 * 15 + 11,
  traces: 1400,
  key: (s) => `${tag(s.site)}|${tag(s.tls)}`,
  filename: (s) => (tag(s.site) === 'InTest' ? 'src/db.test.ts' : 'src/db.ts'),
  code,
};
