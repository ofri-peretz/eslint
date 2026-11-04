const { tag } = require('../../lib.cjs');
const { PG_DRIVERS } = require('../../postgresql.cjs');

const SECRET = "'Pr0d-s3cret!'";
const HOST = "host: 'db.internal', user: 'app', database: 'app'";

/**
 * credential shape -> { pre?: statements before the connection, arg: the
 * config argument, or `configVar` / `factory` for an object built first }.
 */
const CREDS = {
  PasswordLiteral: { arg: `{ ${HOST}, password: ${SECRET} }` },
  QuotedKey: { arg: `{ ${HOST}, 'password': ${SECRET} }` },
  ComputedKey: { arg: `{ ${HOST}, ['password']: ${SECRET} }` },
  ConfigVar: {
    pre: `const config = { ${HOST}, password: ${SECRET} };`,
    arg: 'config',
  },
  Factory: {
    pre: `function dbConfig() {\n  return { ${HOST}, password: ${SECRET} };\n}`,
    arg: 'dbConfig()',
  },
  DsnOption: {
    arg: "{ connectionString: 'postgres://app:Pr0d-s3cret@db.internal:5432/app' }",
  },
  BareDsn: { arg: "'postgres://app:Pr0d-s3cret@db.internal:5432/app'" },
  DsnAnywhere: {
    pre: "export const FALLBACK_URL = 'postgres://app:Pr0d-s3cret@db.internal:5432/app';",
    arg: 'process.env.DATABASE_URL as string',
  },
  PasswordEnv: { arg: `{ ${HOST}, password: process.env.PG_PASSWORD }` },
  DsnEnv: { arg: 'process.env.DATABASE_URL as string' },
  DsnNoPassword: { arg: "'postgres://app@db.internal:5432/app'" },
  LoopbackDsn: { arg: "'postgres://app:devpass@localhost:5432/app'" },
  LoopbackAnywhere: {
    pre: "export const DEV_URL = 'postgres://app:devpass@localhost:5432/app';",
    arg: 'process.env.DATABASE_URL ?? DEV_URL',
  },
  TypeOrm: {
    pre: [
      'export const ormOptions = {',
      "  type: 'postgres',",
      "  url: 'postgres://app:Pr0d-s3cret@db.internal:5432/app',",
      '  entities: [],',
      '  synchronize: false,',
      '};',
    ].join('\n'),
    arg: 'process.env.DATABASE_URL as string',
  },
};

function code(s) {
  const c = tag(s.ctor);
  const { pre, arg } = CREDS[tag(s.cred)];
  const lines = [];
  let make;
  if (c === 'PostgresJs') {
    lines.push("import postgres from 'postgres';");
    make = (a) => `postgres(${a})`;
  } else if (c === 'PgPromise') {
    lines.push(
      "import pgPromise from 'pg-promise';",
      'const pgp = pgPromise();',
    );
    make = (a) => `pgp(${a})`;
  } else {
    lines.push(PG_DRIVERS[c].head);
    make = PG_DRIVERS[c].make;
  }
  if (pre) lines.push(pre);
  lines.push(`export const db = ${make(arg)};`);
  return lines.join('\n') + '\n';
}

module.exports = {
  rule: 'no-hardcoded-credentials',
  // 9 ctors x 14 + postgres.js x 13
  domain: 9 * 14 + 13,
  traces: 1400,
  key: (s) => `${tag(s.ctor)}|${tag(s.cred)}`,
  code,
};
