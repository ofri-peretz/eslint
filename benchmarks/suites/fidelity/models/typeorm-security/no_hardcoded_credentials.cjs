const { tag } = require('../../lib.cjs');
const { TYPEORM, PASSWORDS, CRED_URLS } = require('../../orm.cjs');

/** DataSource options with the password, or the url, at `v`. */
const OPTS = (isUrl, v) =>
  isUrl
    ? `{ type: 'postgres', url: ${v}, entities: [] }`
    : `{ type: 'postgres', host: 'db.internal', port: 5432, username: 'app', password: ${v}, database: 'app', entities: [] }`;

function code(s) {
  const site = tag(s.site);
  const name = tag(s.value);
  const isUrl = name.startsWith('Url');
  const v = (isUrl ? CRED_URLS : PASSWORDS)[name];
  const lines = [v.imports, v.pre];
  const opts = OPTS(isUrl, v.expr);
  const spelling = ['Named', 'Renamed', 'Require', 'Namespace'].includes(site)
    ? TYPEORM[site]
    : undefined;
  if (spelling) {
    lines.unshift(spelling.head);
    lines.push(`export const dataSource = new ${spelling.ctor}(${opts});`);
  } else if (site === 'ConfigVar') {
    lines.unshift(TYPEORM.Named.head);
    lines.push(
      `const options = ${opts};`,
      'export const dataSource = new DataSource(options as any);',
    );
  } else if (site === 'OrmConfig') {
    lines.push(`module.exports = ${opts};`);
  } else if (site === 'NestForRoot') {
    lines.unshift(
      "import { Module } from '@nestjs/common';",
      "import { TypeOrmModule } from '@nestjs/typeorm';",
    );
    lines.push(
      `@Module({ imports: [TypeOrmModule.forRoot(${opts})] })`,
      'export class AppModule {}',
    );
  } else if (site === 'NoImport') {
    lines.unshift('declare function createPool(o: any): any;');
    lines.push(
      `export const pool = createPool(${isUrl ? v.expr : `{ host: 'db.internal', port: 5432, user: 'app', password: ${v.expr}, database: 'app' }`});`,
    );
  } else if (site === 'OtherLib') {
    lines.unshift(TYPEORM.Named.head, "import mysql from 'mysql2/promise';");
    lines.push(
      "export const dataSource = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL, entities: [] });",
      `export const pool = mysql.createPool(${isUrl ? v.expr : `{ host: 'db.internal', port: 3306, user: 'app', password: ${v.expr}, database: 'app' }`});`,
    );
  } else if (site === 'InTest') {
    lines.unshift(TYPEORM.Named.head);
    lines.push(`export const dataSource = new DataSource(${opts});`);
  } else if (site === 'Form') {
    lines.unshift(TYPEORM.Named.head);
    lines.push(
      "export const dataSource = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL, entities: [] });",
      `export const loginForm = { username: 'alice', password: ${v.expr} };`,
    );
  }
  return lines.filter(Boolean).join('\n') + '\n';
}

module.exports = {
  rule: 'no-hardcoded-credentials',
  // 10 sites x 19 values + a login form x 11 passwords
  domain: 10 * 19 + 11,
  traces: 1600,
  key: (s) => `${tag(s.site)}|${tag(s.value)}`,
  filename: (s) => (tag(s.site) === 'InTest' ? 'src/db.test.ts' : 'src/db.ts'),
  code,
};
