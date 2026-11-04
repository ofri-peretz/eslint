const { tag } = require('../../lib.cjs');
const { DRIZZLE, handlerFile } = require('../../orm.cjs');

/** payload -> { pre?: statements before the write, expr: the row }. */
const PAYLOADS = {
  ReqBody: { expr: 'req.body' },
  ReqQuery: { expr: 'req.query' },
  SpreadBody: { expr: '{ ...req.body }' },
  SpreadPlus: { expr: '{ ...req.body, updatedAt: new Date() }' },
  LocalAlias: { pre: 'const input = req.body;', expr: 'input' },
  RestOf: { pre: 'const { id: _ignored, ...rest } = req.body;', expr: 'rest' },
  FetchJson: { pre: 'const payload = await req.json();', expr: 'payload' },
  NamedFields: { expr: '{ name: req.body.name, role: req.body.role }' },
  Validated: {
    pre: 'const input = insertUserSchema.parse(req.body);',
    expr: 'input',
  },
  FormBody: { pre: 'const form = buildForm();', expr: 'form.body' },
  Literal: { expr: "{ name: 'guest', role: 'viewer' }" },
};

/** write -> (h: handle, m: (name) => method accessor, p: row) => the call. */
const WRITES = {
  InsertValues: (h, m, p) => `${h}.insert(users)${m('values')}(${p})`,
  UpdateSet: (h, m, p) =>
    `${h}.update(users)${m('set')}(${p}).where(eq(users.id, Number(id)))`,
  ConflictSet: (h, m, p) =>
    `${h}.insert(users).values({ name: 'x' })${m('onConflictDoUpdate')}({ target: users.id, set: ${p} })`,
  DuplicateSet: (h, m, p) =>
    `${h}.insert(users).values({ name: 'x' })${m('onDuplicateKeyUpdate')}({ set: ${p} })`,
  MapSet: (h, m, p) => `cache${m('set')}(id, ${p})`,
};

const SCHEMA = [
  "const users = pgTable('users', { id: serial('id').primaryKey(), name: text('name'), role: text('role') });",
  'const cache = new Map<string, unknown>();',
  'declare const insertUserSchema: { parse(v: unknown): { name: string } };',
  'declare function buildForm(): { body: { name: string } };',
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
  const { pre = '', expr } = PAYLOADS[tag(s.payload)];
  const head = HEADS[c === 'Bracket' || c === 'Tx' ? 'Named' : c];
  const m = c === 'Bracket' ? (n) => `['${n}']` : (n) => `.${n}`;
  const write = WRITES[tag(s.write)];
  const call =
    c === 'Tx'
      ? `db.transaction(async (tx) => ${write('tx', m, expr)})`
      : write('db', m, expr);
  return handlerFile(
    [...head, ...SCHEMA],
    [pre, `return ${call};`].filter(Boolean).join('\n'),
  );
}

module.exports = {
  rule: 'no-mass-assignment',
  // 6 clients x 5 writes x 11 payloads
  domain: 6 * 5 * 11,
  traces: 2000,
  key: (s) => `${tag(s.client)}|${tag(s.write)}|${tag(s.payload)}`,
  code,
};
