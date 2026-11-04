const { tag } = require('../../lib.cjs');
const { PG_DRIVERS } = require('../../postgresql.cjs');

const URL = 'process.env.DATABASE_URL';

/**
 * ssl shape -> { pre?: statements before the connection, opts: the options
 * object's properties (without braces), dsn?: a pg connectionString instead }.
 */
const SSL = {
  RejectFalse: { opts: 'ssl: { rejectUnauthorized: false }' },
  QuotedKey: { opts: "'ssl': { 'rejectUnauthorized': false }" },
  ComputedKey: { opts: "['ssl']: { ['rejectUnauthorized']: false }" },
  Conditional: {
    pre: "const isProd = process.env.NODE_ENV === 'production';",
    opts: 'ssl: isProd ? { rejectUnauthorized: false } : false',
  },
  SslVar: {
    pre: 'const ssl = { rejectUnauthorized: false };',
    opts: 'ssl',
  },
  ConfigVar: { configVar: 'ssl: { rejectUnauthorized: false }' },
  Factory: { factory: 'ssl: { rejectUnauthorized: false }' },
  NoVerifyDsn: {
    dsn: "'postgres://db.internal:5432/app?sslmode=no-verify'",
  },
  NoVerifyTemplate: { dsn: '`${process.env.DATABASE_URL}?sslmode=no-verify`' },
  RejectTrue: { opts: 'ssl: { rejectUnauthorized: true }' },
  CaOnly: {
    pre: "import { readFileSync } from 'node:fs';",
    opts: "ssl: { ca: readFileSync('/etc/ssl/rds-ca.pem').toString() }",
  },
  SslTrue: { opts: 'ssl: true' },
  SslFalse: { opts: 'ssl: false' },
  VerifyFullDsn: {
    dsn: "'postgres://db.internal:5432/app?sslmode=verify-full'",
  },
  ConditionalSafe: {
    pre: "const isProd = process.env.NODE_ENV === 'production';",
    opts: 'ssl: isProd ? { rejectUnauthorized: true } : false',
  },
};

function code(s) {
  const c = tag(s.ctor);
  const shape = SSL[tag(s.ssl)];
  const lines = [];
  let make;
  if (c === 'PostgresJs') {
    lines.push("import postgres from 'postgres';");
    make = (o) => `postgres(${URL} as string, ${o})`;
  } else if (c === 'PgPromise') {
    lines.push(
      "import pgPromise from 'pg-promise';",
      'const pgp = pgPromise();',
    );
    make = (o) => `pgp(${o})`;
  } else {
    lines.push(PG_DRIVERS[c].head);
    make = PG_DRIVERS[c].make;
  }
  if (shape.pre) lines.push(shape.pre);
  const base = c === 'PostgresJs' ? '' : `connectionString: ${URL}, `;
  let arg;
  if (shape.dsn) {
    arg = `{ connectionString: ${shape.dsn} }`;
  } else if (shape.configVar) {
    lines.push(`const config = { ${base}${shape.configVar} };`);
    arg = 'config';
  } else if (shape.factory) {
    lines.push(
      `function dbConfig() {\n  return { ${base}${shape.factory} };\n}`,
    );
    arg = 'dbConfig()';
  } else {
    arg = `{ ${base}${shape.opts} }`;
  }
  lines.push(`export const db = ${make(arg)};`);
  return lines.filter(Boolean).join('\n') + '\n';
}

module.exports = {
  rule: 'no-insecure-ssl',
  // 8 pg spellings x 15 + postgres.js x 12 + pg-promise x 12
  domain: 8 * 15 + 12 + 12,
  traces: 1600,
  key: (s) => `${tag(s.ctor)}|${tag(s.ssl)}`,
  code,
};
