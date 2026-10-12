// Renders one state of models/postgresql-security.no-unsafe-query.qnt into a
// program. The renderer only spells the shape; the verdict comes from the
// model's `expected`, never from here.

export const plugin = 'postgresql-security';
export const rule = 'no-unsafe-query';
export const dimensions = [
  'source',
  'transform',
  'position',
  'binding',
  'sink',
];

const SINK = {
  PoolQuery: [
    "import { Pool } from 'pg';\nconst pool = new Pool();",
    (q, p) => `pool.query(${q}${p})`,
  ],
  ClientQuery: [
    "import pg from 'pg';\nconst client = new pg.Client();",
    (q, p) => `client.query(${q}${p})`,
  ],
  PgpAny: [
    "import pgPromise from 'pg-promise';\nconst db = pgPromise()(process.env.DATABASE_URL);",
    (q, p) => `db.any(${q}${p})`,
  ],
  SqlUnsafe: [
    "import postgres from 'postgres';\nconst sql = postgres();",
    (q, p) => `sql.unsafe(${q}${p})`,
  ],
};
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
  Join: (_e, s) => `${LIST[s]}.join(',')`,
  ToNumber: (e) => `Number(${e})`,
  ParseInt: (e) => `parseInt(${e}, 10)`,
  EscapeLiteral: (e) => `escapeLiteral(${e})`,
  FormatL: (e) => `format('%L', ${e})`,
  StringCall: (e) => `String(${e})`,
};
const IMPORT = {
  EscapeLiteral: "import { escapeLiteral } from 'pg';",
  FormatL: "import format from 'pg-format';",
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const expr = TRANSFORM[c.transform](SOURCE[c.source], c.source);
  let pre = '';
  let v = expr;
  if (c.binding === 'ViaConst') [pre, v] = [`  const v = ${expr};\n`, 'v'];
  if (c.binding === 'ViaLet')
    [pre, v] = [`  let v = '';\n  v = ${expr};\n`, 'v'];
  if (c.binding === 'ViaHelper')
    [pre, v] = [`  const pick = () => ${expr};\n`, 'pick()'];
  const q =
    c.position === 'Concat'
      ? `'SELECT * FROM users WHERE c = ' + ${v}`
      : c.position === 'Interp'
        ? '`SELECT * FROM users WHERE c = ${' + v + '}`'
        : '`SELECT * FROM users WHERE c = $${' + v + '}`';
  const params = c.position === 'PlaceholderIndex' ? ', [req.body.value]' : '';
  const [imp, call] = SINK[c.sink];
  return [
    imp,
    IMPORT[c.transform] ?? '',
    'export async function handler(req: any, name: string, names: string[]) {',
    `${pre}  return ${call(q, params)};`,
    '}',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}
