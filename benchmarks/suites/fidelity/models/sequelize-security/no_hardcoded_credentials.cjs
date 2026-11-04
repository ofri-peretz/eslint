const { tag } = require('../../lib.cjs');
const { SEQUELIZE, PASSWORDS, CRED_URLS } = require('../../orm.cjs');

const OPTS = (pw) =>
  `{ dialect: 'postgres', host: 'db.internal', port: 5432, username: 'app', password: ${pw}, database: 'app' }`;

function code(s) {
  const site = tag(s.site);
  const name = tag(s.value);
  const isUrl = name.startsWith('Url');
  const v = (isUrl ? CRED_URLS : PASSWORDS)[name];
  const lines = [v.imports, v.pre];
  // `new X(url)` or `new X({ ...options })`
  const ctorArgs = isUrl ? `${v.expr}, { dialect: 'postgres' }` : OPTS(v.expr);
  const spelling = [
    'Named',
    'Default',
    'Require',
    'Renamed',
    'Typescript',
  ].includes(site)
    ? SEQUELIZE[site]
    : undefined;
  if (spelling) {
    lines.unshift(spelling.head);
    lines.push(`export const sequelize = new ${spelling.ctor}(${ctorArgs});`);
  } else if (site === 'ConfigVar') {
    lines.unshift(SEQUELIZE.Named.head);
    lines.push(
      isUrl
        ? `const url = ${v.expr};\nexport const sequelize = new Sequelize(url, { dialect: 'postgres' });`
        : `const options = ${OPTS(v.expr)};\nexport const sequelize = new Sequelize(options as any);`,
    );
  } else if (site === 'CliConfig') {
    const env = isUrl
      ? `{ dialect: 'postgres', url: ${v.expr} }`
      : OPTS(v.expr);
    lines.push(`module.exports = { development: ${env} };`);
  } else if (site === 'NestForRoot') {
    lines.unshift(
      "import { Module } from '@nestjs/common';",
      "import { SequelizeModule } from '@nestjs/sequelize';",
    );
    const opts = isUrl
      ? `{ dialect: 'postgres', uri: ${v.expr} }`
      : OPTS(v.expr);
    lines.push(
      `@Module({ imports: [SequelizeModule.forRoot(${opts})] })`,
      'export class AppModule {}',
    );
  } else if (site === 'Positional') {
    lines.unshift(SEQUELIZE.Named.head);
    lines.push(
      `export const sequelize = new Sequelize('app', 'app', ${v.expr}, { dialect: 'postgres', host: 'db.internal' });`,
    );
  } else if (site === 'NoImport') {
    lines.unshift('declare function createPool(o: any): any;');
    lines.push(
      `export const pool = createPool(${isUrl ? v.expr : `{ host: 'db.internal', port: 5432, user: 'app', password: ${v.expr}, database: 'app' }`});`,
    );
  } else if (site === 'OtherLib') {
    lines.unshift(SEQUELIZE.Named.head, "import mysql from 'mysql2/promise';");
    lines.push(
      "export const sequelize = new Sequelize(process.env.DATABASE_URL as string, { dialect: 'postgres' });",
      `export const pool = mysql.createPool(${isUrl ? v.expr : `{ host: 'db.internal', port: 3306, user: 'app', password: ${v.expr}, database: 'app' }`});`,
    );
  } else if (site === 'InTest') {
    lines.unshift(SEQUELIZE.Named.head);
    lines.push(`export const sequelize = new Sequelize(${ctorArgs});`);
  } else if (site === 'Form') {
    lines.unshift(SEQUELIZE.Named.head);
    lines.push(
      "export const sequelize = new Sequelize(process.env.DATABASE_URL as string, { dialect: 'postgres' });",
      `export const loginForm = { username: 'alice', password: ${v.expr} };`,
    );
  }
  return lines.filter(Boolean).join('\n') + '\n';
}

module.exports = {
  rule: 'no-hardcoded-credentials',
  // 11 sites x 19 values + the positional form and a login form x 11 passwords
  domain: 11 * 19 + 2 * 11,
  traces: 2000,
  key: (s) => `${tag(s.site)}|${tag(s.value)}`,
  filename: (s) => (tag(s.site) === 'InTest' ? 'src/db.test.ts' : 'src/db.ts'),
  code,
};
