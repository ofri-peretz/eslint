const { tag } = require('../../lib.cjs');
const { MYSQL_DRIVERS, handlerFile } = require('../../sql.cjs');

const Q = 'SELECT id, name FROM users WHERE';

/**
 * Shape tag -> { pre?: statements before the sink, args, module?: module-scope
 * declarations }. `pool` is the connection, `mysql` the driver namespace.
 */
const SHAPES = {
  TemplateReq: { args: `\`${Q} id = \${req.query.id}\`` },
  TemplateParam: { args: `\`${Q} id = \${id}\`` },
  ConcatReq: { args: `"${Q} email = '" + req.body.email + "'"` },
  IndirectConcat: {
    pre: `const sql = "${Q} email = '" + req.body.email + "'";`,
    args: 'sql',
  },
  PlusAssign: {
    pre: "let sql = 'SELECT id, name FROM products WHERE 1=1';\nsql += ` AND name = '${req.query.name}'`;",
    args: 'sql',
  },
  OptionsSqlTemplate: { args: `{ sql: \`${Q} id = \${req.query.id}\` }` },
  DoubleQuoted: { args: `\`${Q} name = "\${req.query.name}"\`` },
  EscapeInQuotes: {
    args: `\`${Q} name = '\${pool.escape(req.query.name)}'\``,
  },
  StringCast: { args: `\`${Q} id = \${String(req.query.id)}\`` },
  FragmentReq: {
    args: '`SELECT id, name FROM users ORDER BY ${req.query.sort}`',
  },
  WholeReq: { args: 'req.body.sql' },
  Placeholder: { args: `'${Q} id = ?', [req.query.id]` },
  OptionsValues: { args: `{ sql: '${Q} id = ?', values: [req.query.id] }` },
  EscapeValue: { args: `\`${Q} name = \${pool.escape(req.query.name)}\`` },
  EscapeIdFragment: {
    args: '`SELECT id, name FROM users ORDER BY ${pool.escapeId(req.query.sort)}`',
  },
  FormatWhole: { args: `mysql.format('${Q} id = ?', [req.query.id])` },
  ConstTemplate: {
    module: "const TABLE = 'users';",
    args: '`SELECT id, name FROM ${TABLE} WHERE active = 1`',
  },
  NumberTemplate: {
    args: `\`${Q} active = 1 LIMIT \${Number(req.query.limit)}\``,
  },
  PlaceholderList: {
    args: `\`${Q} id IN (\${ids.map(() => '?').join(',')})\`, ids`,
  },
  AllowlistMap: {
    module: "const SORT = { name: 'name', created: 'created_at' } as const;",
    args: '`SELECT id, name FROM users ORDER BY ${SORT[req.query.sort as keyof typeof SORT]}`',
  },
  RegexChecked: {
    pre: "const col = String(req.query.sort);\nif (!/^[a-z_]+$/.test(col)) throw new Error('bad sort');",
    args: '`SELECT id, name FROM users ORDER BY ${col}`',
  },
  FragmentParam: { args: '`SELECT id, name FROM users ORDER BY ${sort}`' },
  Literal: { args: `'${Q} active = 1'` },
};

const ENV_CFG = '{ host: process.env.DB_HOST, user: process.env.DB_USER }';

function code(s) {
  const d = tag(s.driver);
  const { pre = '', args, module = '' } = SHAPES[tag(s.shape)];
  const driver = MYSQL_DRIVERS[d] ?? MYSQL_DRIVERS.Promise;
  // The handle's written type, if any.
  const annotation = { AnyTyped: ': any', PoolTyped: ': Pool' }[d] ?? '';
  const head =
    d === 'PoolTyped'
      ? "import mysql, { type Pool } from 'mysql2/promise';"
      : driver.head;
  const sink =
    d === 'Execute'
      ? 'pool.execute'
      : d === 'Bracket'
        ? "pool['query']"
        : 'pool.query';
  // `mysql.format` needs the namespace in scope whatever the spelling.
  const imports =
    tag(s.shape) === 'FormatWhole' && !/\bmysql\b/.test(driver.head)
      ? "import { format } from 'mysql2';\nconst mysql = { format };"
      : '';
  const body = [pre, `return ${sink}(${args});`].filter(Boolean).join('\n');
  return handlerFile(head, body, {
    imports,
    pre: [module, `const pool${annotation} = ${driver.make(ENV_CFG)};`]
      .filter(Boolean)
      .join('\n'),
  });
}

module.exports = {
  rule: 'no-unsafe-query',
  // 23 shapes + 13 drivers x 4 shapes
  domain: 23 + 13 * 4,
  traces: 700,
  key: (s) => `${tag(s.part)}|${tag(s.driver)}|${tag(s.shape)}`,
  filename: (s) =>
    tag(s.driver) === 'TestFile' ? 'src/users.test.ts' : 'src/users.ts',
  code,
};
