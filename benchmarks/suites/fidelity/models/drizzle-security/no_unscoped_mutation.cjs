const { tag } = require('../../lib.cjs');
const { DRIZZLE, handlerFile } = require('../../orm.cjs');

const SET = ".set({ role: 'admin' })";
const BY_ID = '.where(eq(users.id, Number(id)))';

/** call -> (h: handle, m: (name) => method accessor) => { pre?, expr }. */
const CALLS = {
  DeleteBare: (h, m) => ({ expr: `${h}${m('delete')}(users)` }),
  DeleteReturning: (h, m) => ({
    expr: `${h}${m('delete')}(users).returning()`,
  }),
  UpdateSet: (h, m) => ({ expr: `${h}${m('update')}(users)${SET}` }),
  UpdateSetReturning: (h, m) => ({
    expr: `${h}${m('update')}(users)${SET}.returning()`,
  }),
  DeleteWhere: (h, m) => ({ expr: `${h}${m('delete')}(users)${BY_ID}` }),
  UpdateWhere: (h, m) => ({ expr: `${h}${m('update')}(users)${SET}${BY_ID}` }),
  WhereVar: (h, m) => ({ expr: `${h}${m('delete')}(users).where(condition)` }),
  Deferred: (h, m) => ({
    pre: `const query = ${h}${m('delete')}(users);`,
    expr: `query${BY_ID}`,
  }),
  MapDelete: (h, m) => ({ expr: `cache${m('delete')}(id)` }),
};

const SCHEMA = [
  "const users = pgTable('users', { id: serial('id').primaryKey(), name: text('name'), role: text('role') });",
  'const cache = new Map<string, unknown>();',
  'declare const condition: any;',
];

const HEADS = {
  Named: [
    "import { eq } from 'drizzle-orm';",
    "import { drizzle } from 'drizzle-orm/node-postgres';",
    "import { pgTable, serial, text } from 'drizzle-orm/pg-core';",
    'const db = drizzle(process.env.DATABASE_URL as string);',
  ],
  Require: [
    "const { eq } = require('drizzle-orm');",
    "const { drizzle } = require('drizzle-orm/node-postgres');",
    "const { pgTable, serial, text } = require('drizzle-orm/pg-core');",
    'const db = drizzle(process.env.DATABASE_URL as string);',
  ],
  Untraced: [
    "import { eq } from 'drizzle-orm';",
    "import { pgTable, serial, text } from 'drizzle-orm/pg-core';",
    "import { db } from '@/lib/db';",
  ],
  NoImport: [
    DRIZZLE.NoImport.pre,
    'declare function eq(a: unknown, b: unknown): unknown;',
    'declare function pgTable(n: string, c: unknown): any;',
    'declare function serial(n: string): any;',
    'declare function text(n: string): any;',
  ],
};

function code(s) {
  const c = tag(s.client);
  const head = HEADS[c === 'Bracket' || c === 'Tx' ? 'Named' : c];
  const m = c === 'Bracket' ? (n) => `['${n}']` : (n) => `.${n}`;
  const build = CALLS[tag(s.call)];
  let body;
  if (c === 'Tx') {
    const { pre = '', expr } = build('tx', m);
    body = `return db.transaction(async (tx) => {\n${[pre, `return ${expr};`]
      .filter(Boolean)
      .map((l) => `  ${l}`)
      .join('\n')}\n});`;
  } else {
    const { pre = '', expr } = build('db', m);
    body = [pre, `return ${expr};`].filter(Boolean).join('\n');
  }
  return handlerFile([...head, ...SCHEMA], body);
}

module.exports = {
  rule: 'no-unscoped-mutation',
  // 6 clients x 9 calls
  domain: 6 * 9,
  traces: 400,
  key: (s) => `${tag(s.client)}|${tag(s.call)}`,
  code,
};
