/**
 * Shared spellings for the postgresql-security models
 * (`models/postgresql-security/`).
 *
 * Every rule in eslint-plugin-postgresql-security is gated on the file holding
 * PostgreSQL evidence (an import of `pg`, `pg-promise`, `postgres`, ...), so
 * each model samples how real code reaches the driver:
 *
 *   - `Named`         `import { Pool } from 'pg'`
 *   - `Default`       `import pg from 'pg'`, `new pg.Pool()`
 *   - `Namespace`     `import * as pg from 'pg'`, `new pg.Pool()`
 *   - `Renamed`       `import { Pool as PgPool } from 'pg'`
 *   - `Require`       `const { Pool } = require('pg')`
 *   - `RequireMember` `const pg = require('pg')`, `new pg['Pool']()`
 *   - `Client`        `import { Client } from 'pg'`, a single connection
 *   - `NoImport`      the same `new Pool()` with no PostgreSQL in the file:
 *                     always silent
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */
const PG_DRIVERS = {
  Named: {
    head: "import { Pool } from 'pg';",
    make: (cfg) => `new Pool(${cfg})`,
  },
  Default: {
    head: "import pg from 'pg';",
    make: (cfg) => `new pg.Pool(${cfg})`,
  },
  Namespace: {
    head: "import * as pg from 'pg';",
    make: (cfg) => `new pg.Pool(${cfg})`,
  },
  Renamed: {
    head: "import { Pool as PgPool } from 'pg';",
    make: (cfg) => `new PgPool(${cfg})`,
  },
  Require: {
    head: "const { Pool } = require('pg');",
    make: (cfg) => `new Pool(${cfg})`,
  },
  RequireMember: {
    head: "const pg = require('pg');",
    make: (cfg) => `new pg['Pool'](${cfg})`,
  },
  Client: {
    head: "import { Client } from 'pg';",
    make: (cfg) => `new Client(${cfg})`,
  },
  NoImport: {
    head: '',
    make: (cfg) => `new Pool(${cfg})`,
  },
};

const ENV_CFG = '{ connectionString: process.env.DATABASE_URL }';

/**
 * A whole file: the driver import, `const <handle> = <driver>(cfg)`, any
 * preamble, and `body` inside an async request handler `(req, res, id)`.
 */
function program(
  driver,
  body,
  { handle = 'pool', pre = '', imports = '' } = {},
) {
  const d = PG_DRIVERS[driver];
  const indented = body
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');
  return (
    [
      d.head,
      imports,
      `const ${handle} = ${d.make(ENV_CFG)};`,
      pre,
      `export async function handle(req: any, res: any, id: string) {\n${indented}\n}`,
    ]
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

/** The non-pg drivers: pg-promise (`db`) and postgres.js (`sql`). */
const OTHER_DRIVERS = {
  PgPromise: [
    "import pgPromise from 'pg-promise';",
    'const pgp = pgPromise();',
    'const db = pgp(process.env.DATABASE_URL as string);',
  ].join('\n'),
  PostgresJs: [
    "import postgres from 'postgres';",
    'const sql = postgres(process.env.DATABASE_URL as string);',
  ].join('\n'),
};

/** A handler file on pg-promise (`db`) or postgres.js (`sql`). */
function driverFile(driver, body, { imports = '' } = {}) {
  const indented = body
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');
  return (
    [
      OTHER_DRIVERS[driver],
      imports,
      `export async function handle(req: any, res: any, id: string) {\n${indented}\n}`,
    ]
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

module.exports = { PG_DRIVERS, ENV_CFG, program, driverFile };
