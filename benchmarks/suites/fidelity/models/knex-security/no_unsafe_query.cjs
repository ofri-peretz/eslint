const { tag } = require('../../lib.cjs');
const { KNEX, SQL_SHAPES, handlerFile } = require('../../orm.cjs');

const FULL = {
  head: 'SELECT id, name FROM users WHERE ',
  col: 'id',
  ohead: 'SELECT id, name FROM users ORDER BY ',
  whole: 'req.body.sql',
};
const WHERE = { head: '', col: 'id', whole: 'req.query.filter' };
const ORDER = { ohead: '', whole: 'req.query.sort' };

/** knex's own bound shapes: `{ pre?, text, args }`. */
const KNEX_SHAPES = {
  Bound: (c) => ({ text: `'${c.head}${c.col} = ?'`, args: '[req.query.id]' }),
  NamedBound: (c) => ({
    text: `'${c.head}${c.col} = :id'`,
    args: '{ id: req.query.id }',
  }),
  Placeholders: (c) => ({
    pre: 'const ids: string[] = req.body.ids;',
    text: `\`${c.head}${c.col} IN (\${ids.map(() => '?').join(',')})\``,
    args: 'ids',
  }),
  BoundButInterpolated: (c) => ({
    text: `\`${c.head}${c.col} = \${req.query.id} AND active = ?\``,
    args: '[true]',
  }),
  IdentBinding: (c) => ({ text: `'${c.ohead}??'`, args: '[req.query.sort]' }),
};

const CFG = "{ client: 'pg', connection: process.env.DATABASE_URL }";
const built = (spelling) => [
  KNEX[spelling].head,
  `const db = ${KNEX[spelling].make(CFG)};`,
];

/** site -> { lines, ctx, call(argList) => statement }. */
const SITES = {
  Default: {
    lines: built('Default'),
    ctx: FULL,
    call: (a) => `return db.raw(${a});`,
  },
  Named: {
    lines: built('Named'),
    ctx: FULL,
    call: (a) => `return db.raw(${a});`,
  },
  Require: {
    lines: built('Require'),
    ctx: FULL,
    call: (a) => `return db.raw(${a});`,
  },
  RequireCall: {
    lines: built('RequireCall'),
    ctx: FULL,
    call: (a) => `return db.raw(${a});`,
  },
  NoImport: {
    lines: ['declare const db: any;'],
    ctx: FULL,
    call: (a) => `return db.raw(${a});`,
  },
  Bracket: {
    lines: built('Default'),
    ctx: FULL,
    call: (a) => `return db['raw'](${a});`,
  },
  Trx: {
    lines: built('Default'),
    ctx: FULL,
    call: (a) =>
      `return db.transaction(async (trx) => {\n  return trx.raw(${a});\n});`,
  },
  Schema: {
    lines: built('Default'),
    ctx: FULL,
    call: (a) => `return db.schema.raw(${a});`,
  },
  InTest: {
    lines: built('Default'),
    ctx: FULL,
    call: (a) => `return db.raw(${a});`,
  },
  WhereRaw: {
    lines: built('Default'),
    ctx: WHERE,
    call: (a) => `return db('users').select('id').whereRaw(${a});`,
  },
  OrderByRaw: {
    lines: built('Default'),
    ctx: ORDER,
    call: (a) => `return db('users').select('id').orderByRaw(${a});`,
  },
  Objection: {
    lines: [
      "import { Model, raw } from 'objection';",
      "class Person extends Model {\n  static tableName = 'persons';\n}",
    ],
    ctx: WHERE,
    call: (a) => `return Person.query().where(raw(${a}));`,
  },
};

function code(s) {
  const site = SITES[tag(s.site)];
  const name = tag(s.shape);
  const shape = KNEX_SHAPES[name]
    ? KNEX_SHAPES[name](site.ctx)
    : SQL_SHAPES[name].make(site.ctx);
  const argList = shape.args ? `${shape.text}, ${shape.args}` : shape.text;
  const body = [shape.pre, site.call(argList)].filter(Boolean).join('\n');
  return handlerFile(site.lines, body);
}

module.exports = {
  rule: 'no-unsafe-query',
  // 9 whole-statement sites x 20 shapes + whereRaw / objection x 14 +
  // orderByRaw x 7
  domain: 9 * 20 + 2 * 14 + 7,
  traces: 2000,
  key: (s) => `${tag(s.site)}|${tag(s.shape)}`,
  filename: (s) =>
    tag(s.site) === 'InTest' ? 'src/users.test.ts' : 'src/users.ts',
  code,
};
