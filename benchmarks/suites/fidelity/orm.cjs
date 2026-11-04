/**
 * Shared spellings for the ORM / query-builder models: drizzle-security,
 * prisma-security, sequelize-security, supabase-security, typeorm-security and
 * knex-security (`models/<plugin>/`).
 *
 * Every rule in those plugins is gated on the file importing its library, so
 * each model samples how real code reaches the client. Each table maps a
 * spelling tag to `{ head, pre }`: the import line(s) and the statements that
 * build the handle the model's sink is called on. Every table has a `NoImport`
 * entry: the same handle code with no library import in the file, which must
 * always stay silent.
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */

/** Drizzle: `db` is a drizzle() instance, `sql` (or its alias) the tag. */
const DRIZZLE = {
  Named: {
    head: "import { sql } from 'drizzle-orm';\nimport { drizzle } from 'drizzle-orm/node-postgres';",
    pre: 'const db = drizzle(process.env.DATABASE_URL as string);',
    sql: 'sql',
  },
  Renamed: {
    head: "import { sql as q } from 'drizzle-orm';\nimport { drizzle } from 'drizzle-orm/node-postgres';",
    pre: 'const db = drizzle(process.env.DATABASE_URL as string);',
    sql: 'q',
  },
  Namespace: {
    head: "import * as orm from 'drizzle-orm';\nimport { drizzle } from 'drizzle-orm/node-postgres';",
    pre: 'const db = drizzle(process.env.DATABASE_URL as string);',
    sql: 'orm.sql',
  },
  Require: {
    head: "const { sql } = require('drizzle-orm');\nconst { drizzle } = require('drizzle-orm/node-postgres');",
    pre: 'const db = drizzle(process.env.DATABASE_URL as string);',
    sql: 'sql',
  },
  // Declared without a type: an `any` annotation would be evidence of its own.
  NoImport: {
    head: '',
    pre: 'declare const sql;\ndeclare const db;',
    sql: 'sql',
  },
};

/** A drizzle table built with the schema helpers, for the builder models. */
const DRIZZLE_TABLE = [
  "import { pgTable, serial, text } from 'drizzle-orm/pg-core';",
  "import { eq } from 'drizzle-orm';",
  "const users = pgTable('users', { id: serial('id').primaryKey(), name: text('name'), role: text('role') });",
].join('\n');

/** Prisma: `prisma` is a PrismaClient. */
const PRISMA = {
  Named: {
    head: "import { PrismaClient, Prisma } from '@prisma/client';",
    pre: 'const prisma = new PrismaClient();',
  },
  Renamed: {
    head: "import { PrismaClient as Client, Prisma } from '@prisma/client';",
    pre: 'const prisma = new Client();',
  },
  Require: {
    head: "const { PrismaClient, Prisma } = require('@prisma/client');",
    pre: 'const prisma = new PrismaClient();',
  },
  Default: {
    head: "import pkg from '@prisma/client';",
    pre: 'const { PrismaClient, Prisma } = pkg;\nconst prisma = new PrismaClient();',
  },
  // Declared without a type: an `any` annotation would be evidence of its own.
  NoImport: {
    head: '',
    pre: 'declare const prisma;\ndeclare const Prisma;',
  },
};

/** Sequelize: `sequelize` is a Sequelize instance, `User` a model. */
const SEQUELIZE = {
  Named: {
    head: "import { Sequelize, DataTypes, QueryTypes } from 'sequelize';",
    ctor: 'Sequelize',
  },
  Default: {
    head: "import Sequelize from 'sequelize';",
    ctor: 'Sequelize',
  },
  Require: {
    head: "const { Sequelize, DataTypes, QueryTypes } = require('sequelize');",
    ctor: 'Sequelize',
  },
  Renamed: {
    head: "import { Sequelize as Db } from 'sequelize';",
    ctor: 'Db',
  },
  Typescript: {
    head: "import { Sequelize } from 'sequelize-typescript';",
    ctor: 'Sequelize',
  },
  NoImport: { head: 'declare const Sequelize: any;', ctor: 'Sequelize' },
};

/** TypeORM: `new DataSource(opts)` and a repository / manager from it. */
const TYPEORM = {
  Named: { head: "import { DataSource } from 'typeorm';", ctor: 'DataSource' },
  Renamed: {
    head: "import { DataSource as Source } from 'typeorm';",
    ctor: 'Source',
  },
  Require: {
    head: "const { DataSource } = require('typeorm');",
    ctor: 'DataSource',
  },
  Namespace: {
    head: "import * as typeorm from 'typeorm';",
    ctor: 'typeorm.DataSource',
  },
  NoImport: { head: 'declare const DataSource: any;', ctor: 'DataSource' },
};

/** Knex: `make(cfg)` builds the instance. */
const KNEX = {
  Default: { head: "import knex from 'knex';", make: (c) => `knex(${c})` },
  Named: { head: "import { knex } from 'knex';", make: (c) => `knex(${c})` },
  Renamed: {
    head: "import createKnex from 'knex';",
    make: (c) => `createKnex(${c})`,
  },
  Require: { head: "const knex = require('knex');", make: (c) => `knex(${c})` },
  RequireCall: { head: '', make: (c) => `require('knex')(${c})` },
  NoImport: { head: 'declare const knex: any;', make: (c) => `knex(${c})` },
};

/** Supabase: `createClient` under its spellings. */
const SUPABASE = {
  Named: {
    head: "import { createClient } from '@supabase/supabase-js';",
    make: 'createClient',
  },
  Renamed: {
    head: "import { createClient as makeClient } from '@supabase/supabase-js';",
    make: 'makeClient',
  },
  Require: {
    head: "const { createClient } = require('@supabase/supabase-js');",
    make: 'createClient',
  },
  Namespace: {
    head: "import * as supa from '@supabase/supabase-js';",
    make: 'supa.createClient',
  },
  // `@supabase/ssr`: any `@supabase/*` import is the evidence.
  Ssr: {
    head: "import { createServerClient } from '@supabase/ssr';",
    make: 'createServerClient',
  },
  NoImport: { head: 'declare const createClient;', make: 'createClient' },
};

/** Module-level `const db = <client>(url, anonKey)` for a SUPABASE spelling. */
const supabaseClient = (spelling) => {
  const { head, make } = SUPABASE[spelling];
  const extra = spelling === 'Ssr' ? ', { cookies: {} as any }' : '';
  return [
    head,
    `const db = ${make}(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string${extra});`,
  ];
};

const indent = (body) =>
  body
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');

/**
 * A whole file: imports, module-level statements, then `body` inside an async
 * Express-style request handler `(req, res, id)`.
 */
function handlerFile(lines, body) {
  return (
    [
      ...lines,
      `export async function handle(req: any, res: any, id: string) {\n${indent(body)}\n}`,
    ]
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

/*
 * Connection-config values shared by the no-hardcoded-credentials and
 * require-tls models of sequelize-, typeorm- and knex-security. Each entry is
 * `{ expr, pre?, imports? }`: the value written at the config property, any
 * module-level statements it needs, and any imports.
 */

/** A `password:` value. */
const PASSWORDS = {
  Literal: { expr: "'hunter2'" },
  Empty: { expr: "''" },
  Env: { expr: 'process.env.DB_PASSWORD' },
  EnvOrLiteral: { expr: "process.env.DB_PASSWORD || 'root'" },
  EnvNullishLiteral: { expr: "process.env.DB_PASSWORD ?? 'root'" },
  ConstBound: { pre: "const DB_PASSWORD = 'hunter2';", expr: 'DB_PASSWORD' },
  TemplateHole: { expr: '`${process.env.DB_PASSWORD_PREFIX}-app`' },
  TemplateNoHole: { expr: '`hunter2`' },
  AliasConfig: {
    imports: "import { config } from '@/config';",
    expr: 'config.db.password',
  },
  TernaryLiteral: {
    expr: "process.env.NODE_ENV === 'production' ? process.env.DB_PASSWORD : 'devpass'",
  },
  BothRuntime: { expr: 'process.env.DB_PASSWORD ?? process.env.PGPASSWORD' },
};

/** A connection URL. */
const CRED_URLS = {
  UrlCreds: { expr: "'postgres://app:s3cret@db.internal:5432/app'" },
  UrlMysqlCreds: { expr: "'mysql://root:root@localhost:3306/app'" },
  UrlUserOnly: { expr: "'postgres://app@db.internal:5432/app'" },
  UrlNoUser: { expr: "'postgres://localhost:5432/app'" },
  UrlEnv: { expr: 'process.env.DATABASE_URL as string' },
  UrlTemplateHead: {
    expr: '`postgres://app:s3cret@${process.env.DB_HOST}/app`',
  },
  UrlTemplateHole: {
    expr: '`postgres://app:${process.env.DB_PASSWORD}@db.internal/app`',
  },
  UrlConst: {
    pre: "const DSN = 'postgres://app:s3cret@db.internal:5432/app';",
    expr: 'DSN',
  },
};

/** An `ssl:` value (`absent` drops the key). */
const TLS = {
  SslFalse: { expr: 'false' },
  RejectFalse: { expr: '{ rejectUnauthorized: false }' },
  RequireRejectFalse: { expr: '{ require: true, rejectUnauthorized: false }' },
  ConstFalse: { pre: 'const USE_SSL = false;', expr: 'USE_SSL' },
  TernaryFalse: {
    expr: "process.env.NODE_ENV === 'production' ? { ca: process.env.DB_CA } : false",
  },
  SslTrue: { expr: 'true' },
  SslCa: {
    imports: "import fs from 'node:fs';",
    expr: "{ ca: fs.readFileSync('/etc/ssl/db-ca.pem', 'utf8') }",
  },
  RejectTrue: { expr: '{ rejectUnauthorized: true, ca: process.env.DB_CA }' },
  Runtime: {
    pre: "const useTls = process.env.DB_SSL === '1';",
    expr: 'useTls',
  },
  RejectRuntime: {
    expr: "{ rejectUnauthorized: process.env.DB_SSL_VERIFY !== '0' }",
  },
  NoSsl: { absent: true },
};

/** A connection URL carrying (or not) an `sslmode`. */
const TLS_URLS = {
  UrlDisable: { expr: "'postgres://db.internal:5432/app?sslmode=disable'" },
  UrlNoVerify: { expr: "'postgres://db.internal:5432/app?sslmode=no-verify'" },
  UrlVerifyFull: {
    expr: "'postgres://db.internal:5432/app?sslmode=verify-full'",
  },
  UrlPlain: { expr: "'postgres://db.internal:5432/app'" },
};

/*
 * Write payloads for the sequelize-, typeorm- and knex-security
 * no-mass-assignment models. `sig` is the handler's parameter list (default
 * Express `(req, res, id)`), `pre` the handler statements before the write,
 * `expr` the payload, `imports` any module-level lines. Whether a payload
 * carries the whole request is stated by each .qnt, not here.
 */
const EXPRESS_SIG = 'req: any, res: any, id: string';
const PAYLOADS = {
  ReqBody: { expr: 'req.body' },
  ReqQuery: { expr: 'req.query' },
  ReqParams: { expr: 'req.params' },
  Spread: { expr: '{ ...req.body }' },
  SpreadPlus: { expr: '{ ...req.body, updatedAt: new Date() }' },
  Alias: { pre: 'const input = req.body;', expr: 'input' },
  Rest: { pre: 'const { id: _ignored, ...rest } = req.body;', expr: 'rest' },
  ObjectAssign: {
    pre: 'const row: any = {};\nObject.assign(row, req.body);',
    expr: 'row',
  },
  FetchJson: {
    sig: 'request: Request, id: string',
    pre: 'const input = await request.json();',
    expr: 'input',
  },
  LambdaEvent: {
    sig: 'event: any, id: string',
    pre: 'const input = JSON.parse(event.body);',
    expr: 'input',
  },
  DestructuredBody: {
    sig: '{ body }: any, res: any, id: string',
    expr: 'body',
  },
  Named: { expr: '{ name: req.body.name, email: req.body.email }' },
  Picked: { pre: 'const { name, email } = req.body;', expr: '{ name, email }' },
  Validated: {
    imports: "import { userSchema } from './schemas';",
    pre: 'const input = userSchema.parse(req.body);',
    expr: 'input',
  },
  Helper: {
    imports: 'declare function buildInput(r: any): any;',
    expr: 'buildInput(req)',
  },
  FormBody: {
    pre: "const form = { body: { name: 'guest' } };",
    expr: 'form.body',
  },
  CtxData: { sig: 'ctx: any, id: string', expr: 'ctx.data' },
  Constant: { expr: "{ name: 'guest', role: 'viewer' }" },
};

/**
 * A file whose handler writes `payload` through `receiver`:
 * `{ head, pre?, write(expr) => statements, cls?: open class header }`.
 */
function writeFile(receiver, payload) {
  const sig = payload.sig ?? EXPRESS_SIG;
  const body = [payload.pre, receiver.write(payload.expr)]
    .filter(Boolean)
    .join('\n');
  const lines = [receiver.head, payload.imports, receiver.pre];
  lines.push(
    receiver.cls
      ? `${receiver.cls}\n  async handle(${sig}) {\n${indent(indent(body))}\n  }\n}`
      : `export async function handle(${sig}) {\n${indent(body)}\n}`,
  );
  return lines.filter(Boolean).join('\n') + '\n';
}

/*
 * SQL text shapes for the sequelize-, typeorm- and knex-security
 * no-unsafe-query models: how a value reaches the SQL string, with no
 * driver-specific binding (each model adds its own bound / escaped shapes).
 * Each returns `{ pre?, text }`, the handler statements first and the SQL
 * text expression handed to the sink. `ctx` says where the text sits:
 *
 *   - `head`  text before a value comparison ('SELECT ... WHERE ' or '')
 *   - `col`   the compared column
 *   - `ohead` text before a fragment (an ORDER BY target)
 *   - `whole` the request field handed over as the whole text
 *
 * `pos` is the SQL position: V (value), F (fragment), W (whole text).
 */
const SQL_SHAPES = {
  TemplateReq: {
    pos: 'V',
    make: (c) => ({ text: `\`${c.head}${c.col} = \${req.query.id}\`` }),
  },
  TemplateParam: {
    pos: 'V',
    make: (c) => ({ text: `\`${c.head}${c.col} = \${id}\`` }),
  },
  ConcatReq: {
    pos: 'V',
    make: (c) => ({ text: `"${c.head}${c.col} = '" + req.body.name + "'"` }),
  },
  PlusAssign: {
    pos: 'V',
    make: (c) => ({
      pre: `let q = '${c.head}1 = 1';\nq += \` AND ${c.col} = '\${id}'\`;`,
      text: 'q',
    }),
  },
  IndirectConcat: {
    pos: 'V',
    make: (c) => ({
      pre: `const q = "${c.head}${c.col} = '" + req.body.name + "'";`,
      text: 'q',
    }),
  },
  StringCast: {
    pos: 'V',
    make: (c) => ({
      text: `\`${c.head}${c.col} = '\${String(req.query.name)}'\``,
    }),
  },
  ConstTemplate: {
    pos: 'V',
    make: (c) => ({
      pre: "const ROLE = 'admin';",
      text: `\`${c.head}${c.col} = '\${ROLE}'\``,
    }),
  },
  NumberTemplate: {
    pos: 'V',
    make: (c) => ({ text: `\`${c.head}${c.col} = \${Number(req.query.id)}\`` }),
  },
  Literal: { pos: 'V', make: (c) => ({ text: `'${c.head}${c.col} = 1'` }) },
  FragmentReq: {
    pos: 'F',
    make: (c) => ({ text: `\`${c.ohead}\${req.query.sort}\`` }),
  },
  FragmentParam: {
    pos: 'F',
    make: (c) => ({ text: `\`${c.ohead}\${id}\`` }),
  },
  AllowlistMap: {
    pos: 'F',
    make: (c) => ({
      pre: "const SORT = { name: 'name', created: 'created_at' } as const;",
      text: `\`${c.ohead}\${SORT[req.query.sort as keyof typeof SORT]}\``,
    }),
  },
  RegexChecked: {
    pos: 'F',
    make: (c) => ({
      pre: "const col = String(req.query.sort);\nif (!/^[a-z_]+$/.test(col)) throw new Error('bad sort');",
      text: `\`${c.ohead}\${col}\``,
    }),
  },
  TernaryLiteral: {
    pos: 'F',
    make: (c) => ({
      text: `\`${c.ohead}name \${req.query.dir === 'desc' ? 'DESC' : 'ASC'}\``,
    }),
  },
  WholeReq: { pos: 'W', make: (c) => ({ text: c.whole }) },
};

module.exports = {
  SQL_SHAPES,
  PAYLOADS,
  writeFile,
  PASSWORDS,
  CRED_URLS,
  TLS,
  TLS_URLS,
  DRIZZLE,
  DRIZZLE_TABLE,
  PRISMA,
  SEQUELIZE,
  TYPEORM,
  KNEX,
  SUPABASE,
  supabaseClient,
  handlerFile,
};
