const { tag } = require('../../lib.cjs');
const { SQLITE_DRIVERS, handlerFile } = require('../../sql.cjs');

const Q = 'SELECT id, name FROM users WHERE';

/**
 * Driver tag -> how a statement runs: `sink(sqlArgs)` hands SQL text to the
 * driver, `bound(sql, values)` binds values to a parameterized statement.
 */
const RUN = {
  // better-sqlite3 / node:sqlite: `db.prepare(sql).all(...values)`.
  prepare: {
    sink: (a) => `db.prepare(${a}).all()`,
    bound: (sql, v) => `db.prepare(${sql}).all(${v})`,
  },
  // sqlite3: `db.all(sql, params, callback)`.
  sqlite3: {
    sink: (a) =>
      `db.all(${a}, (err: unknown, rows: unknown) => res.json(rows))`,
    bound: (sql, v) =>
      `db.all(${sql}, [${v}], (err: unknown, rows: unknown) => res.json(rows))`,
  },
  // bun:sqlite: `db.query(sql).all(...values)`.
  bun: {
    sink: (a) => `db.query(${a}).all()`,
    bound: (sql, v) => `db.query(${sql}).all(${v})`,
  },
  // the `sqlite` wrapper: `await db.all(sql, ...values)`.
  wrapper: {
    sink: (a) => `db.all(${a})`,
    bound: (sql, v) => `db.all(${sql}, ${v})`,
  },
  // @libsql/client: `db.execute(sql)` / `db.execute({ sql, args })`.
  libsql: {
    sink: (a) => `db.execute(${a})`,
    bound: (sql, v) => `db.execute({ sql: ${sql}, args: [${v}] })`,
  },
  bracket: {
    sink: (a) => `db['prepare'](${a}).all()`,
    bound: (sql, v) => `db['prepare'](${sql}).all(${v})`,
  },
};

const DRIVER_RUN = {
  BetterSqlite: 'prepare',
  BetterRequire: 'prepare',
  Sqlite3: 'sqlite3',
  NodeSqlite: 'prepare',
  BunSqlite: 'bun',
  SqliteWrapper: 'wrapper',
  Libsql: 'libsql',
  AnyTyped: 'prepare',
  Bracket: 'bracket',
  NoImport: 'prepare',
  TestFile: 'prepare',
};

/** Shape tag -> (run) => { pre?, module?, stmt }: `stmt` is what is returned. */
const SHAPES = {
  TemplateReq: (r) => ({ stmt: r.sink(`\`${Q} id = \${req.query.id}\``) }),
  TemplateParam: (r) => ({ stmt: r.sink(`\`${Q} id = \${id}\``) }),
  ConcatReq: (r) => ({
    stmt: r.sink(`"${Q} email = '" + req.body.email + "'"`),
  }),
  IndirectConcat: (r) => ({
    pre: `const sql = "${Q} email = '" + req.body.email + "'";`,
    stmt: r.sink('sql'),
  }),
  PlusAssign: (r) => ({
    pre: "let sql = 'SELECT id, name FROM products WHERE 1=1';\nsql += ` AND name = '${req.query.name}'`;",
    stmt: r.sink('sql'),
  }),
  StringCast: (r) => ({
    stmt: r.sink(`\`${Q} id = \${String(req.query.id)}\``),
  }),
  FragmentReq: (r) => ({
    stmt: r.sink('`SELECT id, name FROM users ORDER BY ${req.query.sort}`'),
  }),
  WholeReq: (r) => ({ stmt: r.sink('req.body.sql') }),
  PragmaReq: () => ({ stmt: 'db.pragma(`table_info(${req.query.table})`)' }),
  LibsqlSqlTemplate: () => ({
    stmt: `db.execute({ sql: \`${Q} id = \${req.query.id}\`, args: [] })`,
  }),
  Placeholder: (r) => ({ stmt: r.bound(`'${Q} id = ?'`, 'req.query.id') }),
  NamedParam: (r) => ({
    stmt: r.bound(`'${Q} id = :id'`, '{ id: req.query.id }'),
  }),
  // A template handed to a prepared statement is a bound value, not SQL.
  StatementBound: (r) => ({
    stmt: r.bound(`'${Q} name = ?'`, '`${req.query.first} ${req.query.last}`'),
  }),
  ConstTemplate: (r) => ({
    module: "const TABLE = 'users';",
    stmt: r.sink('`SELECT id, name FROM ${TABLE} WHERE active = 1`'),
  }),
  NumberTemplate: (r) => ({
    stmt: r.sink(`\`${Q} active = 1 LIMIT \${Number(req.query.limit)}\``),
  }),
  PlaceholderList: (r) => ({
    stmt: r.bound(
      `\`${Q} id IN (\${ids.map(() => '?').join(',')})\``,
      '...ids',
    ),
  }),
  AllowlistMap: (r) => ({
    module: "const SORT = { name: 'name', created: 'created_at' } as const;",
    stmt: r.sink(
      '`SELECT id, name FROM users ORDER BY ${SORT[req.query.sort as keyof typeof SORT]}`',
    ),
  }),
  RegexChecked: (r) => ({
    pre: "const col = String(req.query.sort);\nif (!/^[a-z_]+$/.test(col)) throw new Error('bad sort');",
    stmt: r.sink('`SELECT id, name FROM users ORDER BY ${col}`'),
  }),
  FragmentParam: (r) => ({
    stmt: r.sink('`SELECT id, name FROM users ORDER BY ${sort}`'),
  }),
  PragmaParam: () => ({ stmt: 'db.pragma(`table_info(${sort})`)' }),
  LibsqlArgs: () => ({
    stmt: `db.execute({ sql: '${Q} id = ?', args: [req.query.id] })`,
  }),
  RegexExec: () => ({ stmt: '/^\\d+$/.exec(`${req.query.id}`)' }),
  Literal: (r) => ({ stmt: r.sink(`'${Q} active = 1'`) }),
};

function code(s) {
  const d = tag(s.driver);
  const driver = SQLITE_DRIVERS[d] ?? SQLITE_DRIVERS.BetterSqlite;
  const {
    pre = '',
    module = '',
    stmt,
  } = SHAPES[tag(s.shape)](RUN[DRIVER_RUN[d]]);
  const decl =
    d === 'AnyTyped'
      ? driver.decl.replace('const db', 'const db: any')
      : driver.decl;
  const body = [pre, `return ${stmt};`].filter(Boolean).join('\n');
  return handlerFile(driver.head, body, {
    pre: [module, decl].filter(Boolean).join('\n'),
  });
}

module.exports = {
  rule: 'no-unsafe-query',
  // better-sqlite3 x 21 shapes + libsql x 21 shapes + 11 drivers x 4 shapes
  domain: 21 + 21 + 11 * 4,
  traces: 900,
  key: (s) => `${tag(s.part)}|${tag(s.driver)}|${tag(s.shape)}`,
  filename: (s) =>
    tag(s.driver) === 'TestFile' ? 'src/users.test.ts' : 'src/users.ts',
  code,
};
