const { tag } = require('../../lib.cjs');
const { TYPEORM, SQL_SHAPES, handlerFile } = require('../../orm.cjs');

const FULL = {
  head: 'SELECT id, name FROM users WHERE ',
  col: 'id',
  ohead: 'SELECT id, name FROM users ORDER BY ',
  whole: 'req.body.sql',
  ph: '$1',
};
const COND = { head: '', col: 'u.id', whole: 'req.query.filter', ph: ':id' };
const ORDER = { ohead: 'u.', whole: 'req.query.sort' };
// Raw((alias) => `${alias} = ...`): the alias hole is TypeORM's own.
const RAW = { head: '', col: '${alias}', whole: 'req.query.filter', ph: ':id' };

/** TypeORM's own shapes: `{ pre?, text, params?, chain? }`. */
const ORM_SHAPES = {
  Bound: (c) => ({
    text: `'${c.head}${c.col} = ${c.ph}'`.replace(
      /^'(.*\$\{alias\}.*)'$/,
      '`$1`',
    ),
    params: c.ph === '$1' ? '[req.query.id]' : '{ id: req.query.id }',
  }),
  Placeholders: (c) => ({
    pre: 'const ids: string[] = req.body.ids;',
    text: `\`${c.head}${c.col} IN (\${ids.map((_, i) => '$' + (i + 1)).join(',')})\``,
    params: 'ids',
  }),
  SetParameter: (c) => ({
    text: `'${c.head}${c.col} = :id'`,
    chain: ".setParameter('id', req.query.id)",
  }),
  ParamsButInterpolated: (c) => ({
    text: `\`${c.head}${c.col} = \${req.query.id} AND ${c.head ? 'active' : 'u.active'} = ${c.ph === '$1' ? '$1' : ':active'}\``,
    params: c.ph === '$1' ? '[true]' : '{ active: true }',
  }),
  Escaped: (c) => ({
    text: `\`${c.ohead}\${dataSource.driver.escape(req.query.sort)}\``,
  }),
};

const DS = (ctor) =>
  `const dataSource = new ${ctor}({ type: 'postgres', url: process.env.DATABASE_URL, entities: [User] });`;
const lines = (spelling) => [
  TYPEORM[spelling].head,
  "import { User } from './user.entity';",
  DS(TYPEORM[spelling].ctor),
  'const repo = dataSource.getRepository(User);',
];
const call = (recv) => (a) => `return ${recv}(${a});`;
const qb =
  (clause) =>
  (a, chain = '') =>
    `return repo.createQueryBuilder('u')${clause(a)}${chain}.getMany();`;

const SITES = {
  Named: { lines: lines('Named'), ctx: FULL, call: call('dataSource.query') },
  Renamed: {
    lines: lines('Renamed'),
    ctx: FULL,
    call: call('dataSource.query'),
  },
  Require: {
    lines: lines('Require'),
    ctx: FULL,
    call: call('dataSource.query'),
  },
  Namespace: {
    lines: lines('Namespace'),
    ctx: FULL,
    call: call('dataSource.query'),
  },
  NoImport: {
    lines: ['declare const dataSource: any;'],
    ctx: FULL,
    call: call('dataSource.query'),
  },
  Manager: {
    lines: lines('Named'),
    ctx: FULL,
    call: call('dataSource.manager.query'),
  },
  Repo: { lines: lines('Named'), ctx: FULL, call: call('repo.query') },
  Bracket: {
    lines: lines('Named'),
    ctx: FULL,
    call: call("dataSource['query']"),
  },
  InTest: { lines: lines('Named'), ctx: FULL, call: call('dataSource.query') },
  QbWhere: { lines: lines('Named'), ctx: COND, qb: qb((a) => `.where(${a})`) },
  QbAndWhere: {
    lines: lines('Named'),
    ctx: COND,
    qb: qb((a) => `.where('u.active = true').andWhere(${a})`),
  },
  QbJoin: {
    lines: lines('Named'),
    ctx: COND,
    qb: qb((a) => `.leftJoinAndSelect('u.posts', 'p', ${a})`),
  },
  QbOrderBy: {
    lines: lines('Named'),
    ctx: ORDER,
    qb: qb((a) => `.orderBy(${a})`),
  },
  RawOp: {
    lines: [
      "import { DataSource, Raw } from 'typeorm';",
      "import { User } from './user.entity';",
      DS('DataSource'),
      'const repo = dataSource.getRepository(User);',
    ],
    ctx: RAW,
    raw: true,
  },
};

function code(s) {
  const site = SITES[tag(s.site)];
  const name = tag(s.shape);
  const shape = ORM_SHAPES[name]
    ? ORM_SHAPES[name](site.ctx)
    : SQL_SHAPES[name].make(site.ctx);
  const argList = shape.params ? `${shape.text}, ${shape.params}` : shape.text;
  let stmt;
  if (site.raw) {
    const text = name === 'Literal' ? '`${alias} = 1`' : shape.text; // a template, for the alias
    const args = shape.params ? `, ${shape.params}` : '';
    stmt = `return repo.find({ where: { id: Raw((alias) => ${text}${args}) } });`;
  } else if (site.qb) {
    stmt = site.qb(argList, shape.chain);
  } else {
    stmt = site.call(argList);
  }
  return handlerFile(site.lines, [shape.pre, stmt].filter(Boolean).join('\n'));
}

module.exports = {
  rule: 'no-unsafe-query',
  // 9 query() sites x 19 + 3 QB conditions x 13 + orderBy x 7 + Raw() x 9
  domain: 9 * 19 + 3 * 13 + 7 + 9,
  traces: 2400,
  key: (s) => `${tag(s.site)}|${tag(s.shape)}`,
  filename: (s) =>
    tag(s.site) === 'InTest' ? 'src/users.test.ts' : 'src/users.ts',
  code,
};
