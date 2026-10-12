// Shared spelling for the SQL-driver models (mysql, sqlite, knex, sequelize,
// typeorm, prisma, drizzle). Each plugin's renderer supplies its sinks and
// driver import; this file only spells shapes and decides nothing.

const SOURCE = {
  Literal: "'admin'",
  NumberConst: '42',
  ReqBody: 'req.body.name',
  Param: 'name',
  EnvVar: 'process.env.TABLE_NAME',
};
const LIST = {
  Literal: "['a', 'b']",
  NumberConst: '[1, 2]',
  ReqBody: 'req.body.ids',
  Param: 'names',
  EnvVar: "process.env.IDS.split(',')",
};
const TRANSFORM = {
  NoTransform: (e) => e,
  Trim: (e, s) => (s === 'NumberConst' ? `String(${e}).trim()` : `${e}.trim()`),
  ToNumber: (e) => `Number(${e})`,
  // Another library's `escape`: HTML escaping, not SQL.
  Lookalike: (e) => `validator.escape(${e})`,
  Join: (_e, s) => `${LIST[s]}.join(',')`,
  Allowlist: (e) => `(['name', 'email'].includes(${e}) ? ${e} : 'name')`,
  Lookup: (e) => `COLUMNS[${e}]`,
};

// [text before the hole, text after it]. A statement sink takes a whole
// statement; a fragment sink (`whereRaw`, `literal`, `.where`) a clause.
const TEXT = {
  statement: {
    Eq: ['SELECT * FROM users WHERE id = ', ''],
    Quoted: ["SELECT * FROM users WHERE name = '", "'"],
    InList: ['SELECT * FROM users WHERE id IN (', ')'],
    Ident: ['SELECT * FROM users ORDER BY ', ''],
  },
  fragment: {
    Eq: ['id = ', ''],
    Quoted: ["name = '", "'"],
    InList: ['id IN (', ')'],
    Ident: ['', ' = 1'],
  },
};

/** SQL text holding `v` at `position`, as a template or a `+` chain. */
function sqlText(kind, position, v, concat) {
  const [before, after] = TEXT[kind][position === 'EqConcat' ? 'Eq' : position];
  if (concat && position === 'EqConcat') {
    return [before && JSON.stringify(before), v, after && JSON.stringify(after)]
      .filter(Boolean)
      .join(' + ');
  }
  return '`' + before + '${' + v + '}' + after + '`';
}

/**
 * models/<plugin>.no-unsafe-query.qnt
 * @param spec {{ setup: string, escape?: (e: string) => string,
 *   sinks: Record<string, { kind: 'statement' | 'fragment', tagged?: boolean, setup?: string, call: (q: string) => string }> }}
 */
export function renderValues(spec, c) {
  const transform =
    c.transform === 'Escape' ? spec.escape : TRANSFORM[c.transform];
  const expr = transform(SOURCE[c.source], c.source);
  let pre = '';
  let v = expr;
  if (c.binding === 'ViaConst') [pre, v] = [`  const v = ${expr};\n`, 'v'];
  if (c.binding === 'ViaLet')
    [pre, v] = [`  let v = '';\n  v = ${expr};\n`, 'v'];
  if (c.binding === 'ViaHelper')
    [pre, v] = [`  const pick = () => ${expr};\n`, 'pick()'];
  const sink = spec.sinks[c.sink];
  const q = sqlText(sink.kind, c.position, v, !sink.tagged);
  return [
    spec.setup,
    sink.setup ?? '',
    c.transform === 'Lookalike' ? "import validator from 'validator';" : '',
    "const COLUMNS = { a: 'name', b: 'email' } as const;",
    'export async function handler(req: any, name: string, names: string[]) {',
    `${pre}  return ${sink.call(q)};`,
    '}',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}

const IMPORT = {
  Default: (m, f) => [`import M from '${m}';`, `M.${f}`],
  Named: (m, f) => [`import { ${f} } from '${m}';`, f],
  Namespace: (m, f) => [`import * as M from '${m}';`, `M.${f}`],
  Require: (m, f) => [`const M = require('${m}');`, `M.${f}`],
  Aliased: (m, f) => [`import { ${f} as made } from '${m}';`, 'made'],
};
const CALL = {
  Plain: (r, m) => `${r}.${m}`,
  Computed: (r, m) => `${r}['${m}']`,
  Optional: (r, m) => `${r}?.${m}`,
  Cast: (r, m) => `(${r} as any).${m}`,
};
// Another library's client with a method of the same name.
const FOREIGN = {
  module: '@apollo/client',
  factory: 'ApolloClient',
  construct: (ref) => `new ${ref}({})`,
};

/**
 * models/<plugin>.no-unsafe-query.plumbing.qnt
 * @param spec {{ module: string, factory: string, construct: (ref: string) => string, method: string, kind: 'statement' | 'fragment' }}
 */
export function renderPlumbing(spec, c) {
  const lib = c.receiver === 'Driver' ? spec : FOREIGN;
  const [imp, ref] = IMPORT[c.importStyle](lib.module, lib.factory);
  const v = c.source === 'ReqBody' ? 'req.body.name' : "'admin'";
  const q = sqlText(
    spec.kind,
    c.position === 'Value' ? 'Eq' : 'Ident',
    v,
    false,
  );
  return [
    imp,
    `const db = ${lib.construct(ref)};`,
    'export async function handler(req: any) {',
    `  return ${CALL[c.call]('db', spec.method)}(${q});`,
    '}',
    '',
  ].join('\n');
}
