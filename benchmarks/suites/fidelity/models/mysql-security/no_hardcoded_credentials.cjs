const { tag } = require('../../lib.cjs');
const { MYSQL_DRIVERS } = require('../../sql.cjs');

/** Value tag -> { pre?, imports?, param?, expr }: the password. */
const VALUES = {
  Literal: { expr: "'hunter2'" },
  HoleFreeTemplate: { expr: '`hunter2`' },
  ConstLiteral: {
    pre: "const DB_PASSWORD = 's3cret-pass';",
    expr: 'DB_PASSWORD',
  },
  EnvOr: { expr: "process.env.DB_PASSWORD || 'root'" },
  EnvNullish: { expr: "process.env.DB_PASSWORD ?? 'root'" },
  TernaryArm: {
    expr: "process.env.NODE_ENV === 'production' ? process.env.DB_PASSWORD : 'devpass'",
  },
  Empty: { expr: "''" },
  Env: { expr: 'process.env.DB_PASSWORD' },
  Param: { param: 'password: string', expr: 'password' },
  ConfigObject: {
    imports: "import { config } from '@app/config';",
    expr: 'config.db.password',
  },
  TemplateHole: { expr: '`${process.env.DB_PASSWORD_PREFIX}-app`' },
};

const CONN = "host: 'db.internal', user: 'app', database: 'app'";

/** Shape tag -> (pw, make) => statements that hold the password `pw`. */
const SHAPES = {
  Inline: (pw, make) => `const pool = ${make(`{ ${CONN}, password: ${pw} }`)};`,
  ConfigConst: (pw, make) =>
    `const dbConfig = { ${CONN}, password: ${pw} };\nconst pool = ${make('dbConfig')};`,
  HostObject: (pw) => `const dbConfig = { ${CONN}, password: ${pw} };`,
  LoginForm: (pw) => `const credentials = { user: 'alice', password: ${pw} };`,
  SignupForm: (pw) => `const signup = { password: ${pw}, confirm: ${pw} };`,
  OtherLib: (pw) =>
    `const cache = new Redis({ host: 'cache.internal', port: 6379, password: ${pw} });`,
};

/** Url tag -> (make) => { pre?, stmt }. */
const URLS = {
  UriCreds: (make) =>
    `const pool = ${make("{ uri: 'mysql://app:s3cret@db.internal:3306/app' }")};`,
  DsnConst: (make) =>
    `const DSN = 'mysql://app:s3cret@db.internal:3306/app';\nconst pool = ${make('DSN')};`,
  DsnTemplateHost: (make) =>
    `const pool = ${make('`mysql://app:s3cret@${process.env.DB_HOST}/app`')};`,
  UriNoPassword: (make) =>
    `const pool = ${make("{ uri: 'mysql://app@db.internal:3306/app' }")};`,
  UriNoUserinfo: (make) =>
    `const pool = ${make("{ uri: 'mysql://localhost:3306/app' }")};`,
  DsnTemplatePassword: (make) =>
    `const pool = ${make('`mysql://app:${process.env.DB_PASSWORD}@db.internal/app`')};`,
  UriEnv: (make) =>
    `const pool = ${make('{ uri: process.env.DATABASE_URL }')};`,
  PostgresUri: (make) =>
    `const pool = ${make("{ uri: 'postgres://app:s3cret@db.internal:5432/app' }")};`,
};

function code(s) {
  const d = tag(s.driver);
  const driver = MYSQL_DRIVERS[d === 'TestFile' ? 'Promise' : d];
  const value = VALUES[tag(s.value)];
  const shape = tag(s.shape);
  const lines =
    tag(s.part) === 'Urls'
      ? URLS[tag(s.url)](driver.make)
      : SHAPES[shape](value.expr, driver.make);
  const imports = [
    driver.head,
    value.imports,
    shape === 'OtherLib' ? "import Redis from 'ioredis';" : '',
  ];
  const body = [value.pre, lines].filter(Boolean).join('\n');
  const tail = value.param
    ? `export function connect(${value.param}) {\n${body
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')}\n}`
    : body;
  return [...imports, tail].filter(Boolean).join('\n') + '\n';
}

module.exports = {
  rule: 'no-hardcoded-credentials',
  // 11 values + 6 shapes x 2 + 8 urls + 9 drivers x 2
  domain: 11 + 6 * 2 + 8 + 9 * 2,
  traces: 500,
  key: (s) =>
    `${tag(s.part)}|${tag(s.value)}|${tag(s.shape)}|${tag(s.url)}|${tag(s.driver)}`,
  filename: (s) =>
    tag(s.driver) === 'TestFile' ? 'src/db.test.ts' : 'src/db.ts',
  code,
};
