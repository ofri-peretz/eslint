const { tag } = require('../../lib.cjs');
const { KNEX } = require('../../orm.cjs');

const CFG = "{ client: 'pg', connection: process.env.DATABASE_URL }";
const built = (spelling) =>
  `${KNEX[spelling].head}\nconst db = ${KNEX[spelling].make(CFG)};`;

const VERBS = {
  Del: '.del()',
  Delete: '.delete()',
  Update: '.update({ active: false })',
};

const SCOPES = {
  NoScope: '',
  Where: '.where({ id })',
  WhereIn: ".whereIn('id', [id])",
  WhereRaw: ".whereRaw('id = ?', [id])",
  AndWhere: ".andWhere('id', id)",
  OrWhere: ".orWhere('id', id)",
  WhereNull: ".whereNull('deleted_at')",
  Returning: ".returning('id')",
  Limit: '.limit(1)',
};

/** Statements mutating `table` (an expression) with `verb` under `scope`. */
function mutate(table, verb, scope, { bracket = false } = {}) {
  const v = bracket
    ? `['${verb.slice(1, verb.indexOf('('))}']${verb.slice(verb.indexOf('('))}`
    : verb;
  if (scope === 'Conditional')
    return `const q = ${table};\nif (id) q.where({ id });\nawait q${v};`;
  if (scope === 'Helper')
    return `const q = ${table};\napplyFilters(q, { id });\nawait q${v};`;
  return `await ${table}${SCOPES[scope]}${v};`;
}

const handler = (head, body) =>
  `${head}\ndeclare function applyFilters(q: any, f: any): void;\nexport async function handle(req: any, res: any, id: string) {\n${body
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n')}\n}\n`;

function code(s) {
  const r = tag(s.receiver);
  const verb = VERBS[tag(s.verb)];
  const scope = tag(s.scope);
  const m = (t, o) => mutate(t, verb, scope, o);
  switch (r) {
    case 'Default':
    case 'InTest':
      return handler(built('Default'), m("db('users')"));
    case 'From':
      return handler(built('Default'), m("db.from('users')"));
    case 'Table':
      return handler(built('Default'), m("db.table('users')"));
    case 'Trx':
      return handler(
        built('Default'),
        `await db.transaction(async (trx) => {\n${m("trx('users')")
          .split('\n')
          .map((l) => `  ${l}`)
          .join('\n')}\n});`,
      );
    case 'Bracket':
      return handler(built('Default'), m("db('users')", { bracket: true }));
    case 'NamedImport':
      return handler(built('Named'), m("db('users')"));
    case 'RequireCall':
      return handler(built('RequireCall'), m("db('users')"));
    case 'UntracedTable':
      // a path alias is not resolved, so the handle is untraceable
      return handler(
        `${KNEX.Default.head}\nimport { db } from '@/lib/db';`,
        m("db('users')"),
      );
    case 'UntracedPlain':
      return handler(
        `${KNEX.Default.head}\nimport { cache } from '@/lib/cache';`,
        `await cache${verb};`,
      );
    case 'MapDelete':
      return handler(
        `${KNEX.Default.head}\nconst sessions = new Map<string, unknown>();`,
        'sessions.delete(id);',
      );
    case 'NoImport':
      return handler('declare const db: any;', m("db('users')"));
    case 'Migration':
    case 'Seed': {
      const fn = r === 'Migration' ? 'up' : 'seed';
      const body = mutate("knex('users')", verb, scope)
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n');
      return [
        "import type { Knex } from 'knex';",
        'declare function applyFilters(q: any, f: any): void;',
        'const id = process.env.TARGET_ID;',
        `export async function ${fn}(knex: Knex): Promise<void> {\n${body}\n}`,
        '',
      ].join('\n');
    }
    default:
      throw new Error(r);
  }
}

module.exports = {
  rule: 'no-unscoped-mutation',
  // 12 builder receivers x 3 verbs x 11 scopes + a plain receiver x 3 + Map
  domain: 12 * 3 * 11 + 3 + 1,
  traces: 3600,
  key: (s) => `${tag(s.receiver)}|${tag(s.verb)}|${tag(s.scope)}`,
  filename: (s) => {
    const r = tag(s.receiver);
    if (r === 'InTest') return 'src/users.test.ts';
    if (r === 'Migration') return 'migrations/20260101000000_backfill.ts';
    if (r === 'Seed') return 'seeds/01_users.ts';
    return 'src/users.ts';
  },
  code,
};
