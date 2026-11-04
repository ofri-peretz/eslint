const { tag } = require('../../lib.cjs');
const { DRIZZLE, handlerFile } = require('../../orm.cjs');

const Q = 'SELECT id, name FROM users WHERE';

/** shape -> { pre?: statements before the sink, text: the SQL text }. */
const SHAPES = {
  TemplateReq: { text: `\`${Q} id = \${req.query.id}\`` },
  TemplateParam: { text: `\`${Q} id = \${id}\`` },
  ConcatReq: { text: `'${Q} email = ' + req.body.email` },
  PlusAssign: {
    pre: `let text = '${Q} 1=1';\ntext += \` AND name = '\${req.query.name}'\`;`,
    text: 'text',
  },
  WholeReq: { text: 'req.body.sql' },
  OrderByReq: {
    text: '`SELECT id, name FROM users ORDER BY ${req.query.sort}`',
  },
  Literal: { text: `'${Q} active = true'` },
  ConstTemplate: {
    pre: "const TABLE = 'users';",
    text: '`SELECT id, name FROM ${TABLE} WHERE active = true`',
  },
  NumberTemplate: {
    text: `\`${Q} active = true LIMIT \${Number(req.query.limit)}\``,
  },
  AllowlistOrder: {
    pre: "const SORT = { name: 'name', created: 'created_at' } as const;",
    text: '`SELECT id, name FROM users ORDER BY ${SORT[req.query.sort as keyof typeof SORT]}`',
  },
  OrderByParam: { text: '`SELECT id, name FROM users ORDER BY ${id}`' },
};

function code(s) {
  const c = DRIZZLE[tag(s.client)];
  const k = tag(s.sink);
  const shape = tag(s.shape);
  const { pre = '', text } = SHAPES[shape];
  const call = {
    SqlRaw: () => `db.execute(${c.sql}.raw(${text}))`,
    SqlRawBracket: () => `db.execute(${c.sql}['raw'](${text}))`,
    Execute: () => `db.execute(${text})`,
    ExecuteBracket: () => `db['execute'](${text})`,
    Run: () => `db.run(${text})`,
    All: () => `db.all(${text})`,
    // The same text, as a parameterizing `sql` template.
    Tagged: () => `db.execute(${c.sql}${text})`,
  }[k]();
  return handlerFile(
    [c.head, c.pre],
    [k === 'Tagged' ? '' : pre, `return ${call};`].filter(Boolean).join('\n'),
  );
}

module.exports = {
  rule: 'no-unsafe-query',
  // 5 clients x (6 text sinks x 11 shapes + the tagged template x 3)
  domain: 5 * (6 * 11 + 3),
  traces: 1800,
  key: (s) => `${tag(s.client)}|${tag(s.sink)}|${tag(s.shape)}`,
  code,
};
