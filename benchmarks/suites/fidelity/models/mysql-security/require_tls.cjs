const { tag } = require('../../lib.cjs');
const { MYSQL_DRIVERS } = require('../../sql.cjs');

/**
 * Value tag -> { pre?, param?, ssl, tls }: `ssl` is the config's `ssl`
 * property (null: none), `tls` the bare TLS options object for shapes that
 * take one (LoneTls, HttpsAgent).
 */
const VALUES = {
  SslFalse: { ssl: 'false', tls: '{ rejectUnauthorized: false }' },
  ConstFalse: {
    pre: 'const USE_TLS = false;',
    ssl: 'USE_TLS',
    tls: '{ rejectUnauthorized: USE_TLS }',
  },
  RejectFalse: {
    ssl: '{ rejectUnauthorized: false }',
    tls: '{ rejectUnauthorized: false }',
  },
  CaRejectFalse: {
    ssl: '{ ca: readFileSync(CA_PATH), rejectUnauthorized: false }',
    tls: '{ ca: readFileSync(CA_PATH), rejectUnauthorized: false }',
  },
  RejectConstFalse: {
    pre: 'const VERIFY = false;',
    ssl: '{ rejectUnauthorized: VERIFY }',
    tls: '{ rejectUnauthorized: VERIFY }',
  },
  TernaryFalseArm: {
    ssl: "process.env.NODE_ENV === 'production' ? { ca: readFileSync(CA_PATH) } : false",
    tls: "{ rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false }",
  },
  Ca: {
    ssl: '{ ca: readFileSync(CA_PATH) }',
    tls: '{ ca: readFileSync(CA_PATH) }',
  },
  AmazonRds: { ssl: "'Amazon RDS'", tls: "{ servername: 'db.internal' }" },
  RejectTrue: {
    ssl: '{ ca: readFileSync(CA_PATH), rejectUnauthorized: true }',
    tls: '{ rejectUnauthorized: true }',
  },
  RuntimeParam: {
    param: 'useTls: boolean',
    ssl: 'useTls ? { ca: readFileSync(CA_PATH) } : undefined',
    tls: '{ rejectUnauthorized: useTls }',
  },
  EnvCompare: {
    ssl: "process.env.DB_SSL === '1' ? { ca: readFileSync(CA_PATH) } : undefined",
    tls: "{ rejectUnauthorized: process.env.DB_SSL === '1' }",
  },
  Absent: { ssl: null, tls: '{}' },
};

const CONN = "host: 'db.internal', user: 'app', database: 'app'";
const cfg = (v) => `{ ${CONN}${v.ssl === null ? '' : `, ssl: ${v.ssl}`} }`;

/** Shape tag -> (v, make) => statements. */
const SHAPES = {
  Inline: (v, make) => `const pool = ${make(cfg(v))};`,
  ConfigConst: (v, make) =>
    `const dbConfig = ${cfg(v)};\nconst pool = ${make('dbConfig')};`,
  HostObject: (v) => `const dbConfig = ${cfg(v)};`,
  LoneTls: (v) => `const tlsOptions = ${v.tls};`,
  HttpsAgent: (v) =>
    `const agent = new https.Agent({ host: 'api.internal', ...${v.tls} });`,
};

const URLS = {
  UrlSslFalse: "'mysql://app@db.internal:3306/app?ssl=false'",
  UrlPlain: "'mysql://app@db.internal:3306/app'",
};

function code(s) {
  const d = tag(s.driver);
  const driver = MYSQL_DRIVERS[d === 'TestFile' ? 'Promise' : d];
  const v = VALUES[tag(s.value)];
  const shape = tag(s.shape);
  const lines =
    tag(s.part) === 'Urls'
      ? `const pool = ${driver.make(URLS[tag(s.url)])};`
      : SHAPES[shape](v, driver.make);
  const head = [
    driver.head,
    "import { readFileSync } from 'node:fs';",
    shape === 'HttpsAgent' ? "import https from 'node:https';" : '',
    "const CA_PATH = '/etc/ssl/rds-ca.pem';",
  ];
  const body = [v.pre, lines].filter(Boolean).join('\n');
  const tail = v.param
    ? `export function connect(${v.param}) {\n${body
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')}\n}`
    : body;
  return [...head, tail].filter(Boolean).join('\n') + '\n';
}

module.exports = {
  rule: 'require-tls',
  // 12 values + 5 shapes x 2 + (2 urls x 9 drivers) + 9 drivers x 2
  domain: 12 + 5 * 2 + 2 * 9 + 9 * 2,
  traces: 500,
  key: (s) =>
    `${tag(s.part)}|${tag(s.value)}|${tag(s.shape)}|${tag(s.url)}|${tag(s.driver)}`,
  filename: (s) =>
    tag(s.driver) === 'TestFile' ? 'src/db.test.ts' : 'src/db.ts',
  code,
};
