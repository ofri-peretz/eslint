const { tag } = require('../../lib.cjs');
const { SEQUELIZE, SQL_SHAPES, handlerFile } = require('../../orm.cjs');

const FULL = {
  head: 'SELECT id, name FROM users WHERE ',
  col: 'id',
  ohead: 'SELECT id, name FROM users ORDER BY ',
  whole: 'req.body.sql',
};
/** A literal() fragment: a condition or a sort target. */
const FRAG = { head: '', col: 'id', ohead: '', whole: 'req.query.sort' };

/** Sequelize's own shapes: `{ pre?, text, opts? }`. */
const SEQ_SHAPES = {
  Replacements: (c) => ({
    text: `'${c.head}${c.col} = :id'`,
    opts: '{ replacements: { id: req.query.id } }',
  }),
  ReplacementsArray: (c) => ({
    text: `'${c.head}${c.col} = ?'`,
    opts: '{ replacements: [req.query.id] }',
  }),
  BindParam: (c) => ({
    text: `'${c.head}${c.col} = $1'`,
    opts: '{ bind: [req.query.id] }',
  }),
  Placeholders: (c) => ({
    pre: 'const ids: string[] = req.body.ids;',
    text: `\`${c.head}${c.col} IN (\${ids.map(() => '?').join(',')})\``,
    opts: '{ replacements: ids }',
  }),
  ReplacementsButInterpolated: (c) => ({
    text: `\`${c.head}${c.col} = \${req.query.id} AND active = :active\``,
    opts: '{ replacements: { active: true } }',
  }),
  Escaped: (c) => ({
    text: `\`${c.head}name = \${sequelize.escape(req.query.name)}\``,
  }),
};

const INSTANCE =
  'const sequelize = new Sequelize(process.env.DATABASE_URL as string);';
const QUERY = (a) => `return sequelize.query(${a});`;
const query = (spelling) => ({
  lines: [
    SEQUELIZE[spelling].head,
    `const sequelize = new ${SEQUELIZE[spelling].ctor}(process.env.DATABASE_URL as string);`,
  ],
  ctx: FULL,
  call: QUERY,
});
const MODEL = "const User = sequelize.define('User', {});";
// A fragment goes in `where` (a condition) or `order` (a sort target).
const findAll = (lit) => (a, sh) =>
  SQL_SHAPES[sh]?.pos === 'F'
    ? `return User.findAll({ order: ${lit}(${a}) });`
    : `return User.findAll({ where: ${lit}(${a}) });`;

const SITES = {
  Named: query('Named'),
  Default: query('Default'),
  Require: query('Require'),
  Renamed: {
    lines: [
      SEQUELIZE.Renamed.head,
      'const sequelize = new Db(process.env.DATABASE_URL as string);',
    ],
    ctx: FULL,
    call: QUERY,
  },
  Typescript: query('Typescript'),
  NoImport: {
    lines: ['declare const sequelize: any;'],
    ctx: FULL,
    call: QUERY,
  },
  Bracket: {
    ...query('Named'),
    call: (a) => `return sequelize['query'](${a});`,
  },
  InTest: query('Named'),
  LiteralStatic: {
    lines: [SEQUELIZE.Named.head, INSTANCE, MODEL],
    ctx: FRAG,
    call: findAll('Sequelize.literal'),
  },
  LiteralNamed: {
    lines: ["import { Sequelize, literal } from 'sequelize';", INSTANCE, MODEL],
    ctx: FRAG,
    call: findAll('literal'),
  },
  LiteralInstance: {
    lines: [SEQUELIZE.Named.head, INSTANCE, MODEL],
    ctx: FRAG,
    call: findAll('sequelize.literal'),
  },
};

function code(s) {
  const site = SITES[tag(s.site)];
  const name = tag(s.shape);
  const shape = SEQ_SHAPES[name]
    ? SEQ_SHAPES[name](site.ctx)
    : SQL_SHAPES[name].make(site.ctx);
  const argList = shape.opts ? `${shape.text}, ${shape.opts}` : shape.text;
  const body = [shape.pre, site.call(argList, name)].filter(Boolean).join('\n');
  return handlerFile(site.lines, body);
}

module.exports = {
  rule: 'no-unsafe-query',
  // 8 query() sites x 21 shapes + 3 literal() sites x 16 unbound shapes
  domain: 8 * 21 + 3 * 16,
  traces: 2200,
  key: (s) => `${tag(s.site)}|${tag(s.shape)}`,
  filename: (s) =>
    tag(s.site) === 'InTest' ? 'src/users.test.ts' : 'src/users.ts',
  code,
};
