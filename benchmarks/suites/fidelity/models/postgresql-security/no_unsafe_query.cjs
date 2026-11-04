const { tag } = require('../../lib.cjs');
const { program, driverFile } = require('../../postgresql.cjs');

const Q = 'SELECT id, name FROM users WHERE';

/** shape -> { pre?: statements before the sink, args: the sink's arguments }. */
const SHAPES = {
  TemplateReq: { args: `\`${Q} id = \${req.query.id}\`` },
  TemplateParam: { args: `\`${Q} id = \${id}\`` },
  ConcatReq: { args: `"${Q} name = '" + req.body.name + "'"` },
  IndirectConcat: {
    pre: `const q = "${Q} name = '" + req.body.name + "'";`,
    args: 'q',
  },
  NullishAssign: {
    pre: `let q: string | undefined;\nq ??= \`${Q} id = \${req.query.id}\`;`,
    args: 'q',
  },
  StringCast: { args: `\`${Q} name = '\${String(req.query.name)}'\`` },
  BindIndexBody: {
    pre: 'const params = [req.query.id];',
    args: `\`${Q} id = $\${req.body.x.length}\`, params`,
  },
  QueryConfigTemplate: { args: `{ text: \`${Q} id = \${req.query.id}\` }` },
  Parameterized: { args: `'${Q} id = $1', [req.query.id]` },
  QueryConfig: { args: `{ text: '${Q} id = $1', values: [req.query.id] }` },
  ConstTemplate: {
    pre: "const TABLE = 'users';",
    args: '`SELECT id, name FROM ${TABLE} WHERE active = true`',
  },
  NumberTemplate: {
    args: `\`${Q} active = true LIMIT \${Number(req.query.limit)}\``,
  },
  AllowlistTemplate: {
    pre: "const SORT = { name: 'name', created: 'created_at' } as const;",
    args: '`SELECT id, name FROM users ORDER BY ${SORT[req.query.sort as keyof typeof SORT]}`',
  },
  FormatLiteral: { args: `\`${Q} name = \${format.literal(req.query.name)}\`` },
  BindIndex: {
    pre: 'const params = [req.query.id];',
    args: `\`${Q} id = $\${params.length}\`, params`,
  },
  NotSql: { args: '`event:${req.query.name}`' },
  Literal: { args: `'${Q} active = true'` },
};

function code(s) {
  const d = tag(s.driver);
  const shape = tag(s.shape);
  const imports =
    shape === 'FormatLiteral' ? "import format from 'pg-format';" : '';
  if (shape === 'Tagged')
    return driverFile(d, `return sql\`${Q} id = \${req.query.id}\`;`);
  const { pre = '', args } = SHAPES[shape];
  if (d === 'PgPromise' || d === 'PostgresJs') {
    const sink = d === 'PgPromise' ? 'db.any' : 'sql.unsafe';
    return driverFile(
      d,
      [pre, `return ${sink}(${args});`].filter(Boolean).join('\n'),
      { imports },
    );
  }
  const ctor = d === 'SinkBracket' ? 'Named' : d;
  const handle = d === 'Client' ? 'client' : 'pool';
  const sink = d === 'SinkBracket' ? `${handle}['query']` : `${handle}.query`;
  const body = [pre, `return ${sink}(${args});`].filter(Boolean).join('\n');
  return program(ctor, body, { handle, imports });
}

module.exports = {
  rule: 'no-unsafe-query',
  // 9 pg spellings x 17 shapes + pg-promise x 15 + postgres.js x 16
  domain: 9 * 17 + 15 + 16,
  traces: 1400,
  key: (s) => `${tag(s.driver)}|${tag(s.shape)}`,
  code,
};
