/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A value the file proves to be a compile-time constant cannot change the
 * statement, so interpolating it into raw SQL is not a finding.
 *
 * Found scanning Infisical (2026-11-26): 89 reports, none exploitable. The ones
 * a file can decide are `${TableName.Project}` (a member of an enum declared in a
 * module the file imports by a relative path), `${LIMIT}` (a `const` bound to a
 * literal), `${Status.Active}` / `${COLUMNS.id}` (enum and `as const` members)
 * and `${limit}` for a destructured parameter typed `number` in this file.
 *
 * Each proof has a control beside it: the same shape with one link replaced by
 * something the file cannot fix — a parameter, request data, an enum member
 * computed at run time, a `let` that is reassigned, an import from a path alias
 * or a package. Those stay reported. The decision never reads a name: a
 * constant called `userInput` is as safe as one called `TABLE`, and a parameter
 * called `TABLE` is as unsafe as one called `userInput`.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll } from 'vitest';
import { noUnsafeQuery } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

// A project on disk: `schemas/index.ts` re-exports `schemas/models.ts`, where the
// enums live, the way Infisical's `db/schemas` barrel does.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knex-const-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
fs.mkdirSync(path.join(dir, 'schemas'));
fs.writeFileSync(
  path.join(dir, 'schemas', 'models.ts'),
  [
    'export enum TableName { Project = "projects", Folder = "secret_folders" }',
    'export enum Computed { Dyn = String(process.env.X) }',
    'export const NOT_AN_ENUM = process.env.X;',
  ].join('\n'),
);
fs.writeFileSync(
  path.join(dir, 'schemas', 'index.ts'),
  'export * from "./models";\n',
);
const FILE = path.join(dir, 'migrations', 'm.ts');
const KNEX = "import knex from 'knex';\n";
const REPORTED = [{ messageId: 'unsafeTemplateLiteral' as const }];

ruleTester.run(
  'no-unsafe-query — a compile-time constant is not injectable',
  noUnsafeQuery,
  {
    valid: [
      {
        name: 'const bound to a string literal',
        code: `${KNEX}const T = 'users';\nknex.raw(\`SELECT * FROM t WHERE c = \${T}\`);`,
      },
      {
        name: 'const bound to a numeric literal',
        code: `${KNEX}const LIMIT = 100;\nknex.raw(\`SELECT * FROM t WHERE c > \${LIMIT}\`);`,
      },
      {
        name: 'numeric literal inline',
        code: `${KNEX}knex.raw(\`SELECT * FROM t WHERE c > \${100}\`);`,
      },
      {
        name: 'member of an enum declared in this file',
        code: `${KNEX}enum Status { Active = 'active' }\nknex.whereRaw(\`status = '\${Status.Active}'\`);`,
      },
      {
        name: 'member of an `as const` object',
        code: `${KNEX}const COLUMNS = { id: 'users.id' } as const;\nknex.whereRaw(\`\${COLUMNS.id} IS NOT NULL\`);`,
      },
      {
        name: 'a constant that is itself built from constants',
        code: `${KNEX}enum T { A = 'a' }\nconst col = \`"\${T.A}"."id"\`;\nknex.whereRaw(\`\${col} = 1\`);`,
      },
      {
        name: 'destructured parameter typed number through a local interface',
        code: `${KNEX}interface Opts { ms: number; label: string }\nconst run = async ({ ms }: Opts) => knex.raw(\`SET LOCAL statement_timeout = \${ms}\`);`,
      },
      {
        name: 'destructured parameter typed number through an inline type',
        code: `${KNEX}const run = async ({ ms }: { ms: number }) => knex.raw(\`SET LOCAL statement_timeout = \${ms}\`);`,
      },
      {
        name: 'destructured parameter typed number through a type alias',
        code: `${KNEX}type Opts = { ms: number };\nconst run = async ({ ms }: Opts) => knex.raw(\`SET LOCAL statement_timeout = \${ms}\`);`,
      },
      {
        name: 'enum imported by a relative path through a barrel',
        filename: FILE,
        code: `import knex from 'knex';\nimport { TableName } from '../schemas';\nknex.whereRaw(\`v.row_num > \${TableName.Project}."pitVersionLimit"\`);`,
      },
      {
        name: 'enum member reached through a constant built from an imported enum',
        filename: FILE,
        code: `import knex from 'knex';\nimport { TableName } from '../schemas';\nconst id = \`"\${TableName.Folder}"."id"::uuid\`;\nknex.whereRaw(\`"a"."x" = \${id}\`);`,
      },
    ],
    invalid: [
      {
        name: 'a parameter with the same shape as the constant',
        code: `${KNEX}function f(T: string) { knex.raw(\`SELECT * FROM t WHERE c = \${T}\`); }`,
        errors: REPORTED,
      },
      {
        name: 'a parameter whose name looks like a constant',
        code: `${KNEX}function f(TABLE_NAME: string) { knex.raw(\`SELECT * FROM t WHERE c = \${TABLE_NAME}\`); }`,
        errors: REPORTED,
      },
      {
        name: 'a const bound to request data',
        code: `${KNEX}function f(req) { const T = req.body.table; knex.raw(\`SELECT * FROM t WHERE c = \${T}\`); }`,
        errors: REPORTED,
      },
      {
        name: 'a let that one path overwrites with request data',
        code: `${KNEX}function f(req) { let T = 'users'; if (req.q) T = req.q; knex.raw(\`SELECT * FROM t WHERE c = \${T}\`); }`,
        errors: REPORTED,
      },
      {
        name: 'an enum member whose initialiser is computed at run time',
        code: `${KNEX}enum E { A = String(process.env.X) }\nknex.raw(\`SELECT * FROM t WHERE c = \${E.A}\`);`,
        errors: REPORTED,
      },
      {
        name: 'an enum member looked up with a key the enum does not declare',
        code: `${KNEX}enum E { A = 'a' }\nknex.raw(\`SELECT * FROM t WHERE c = \${E.Missing}\`);`,
        errors: REPORTED,
      },
      {
        name: 'a destructured parameter typed string',
        code: `${KNEX}interface Opts { table: string }\nconst run = ({ table }: Opts) => knex.raw(\`SELECT * FROM t WHERE c = \${table}\`);`,
        errors: REPORTED,
      },
      {
        name: 'a destructured parameter whose interface lists another key as number',
        code: `${KNEX}interface Opts { ms: number }\nconst run = ({ table }: Opts) => knex.raw(\`SELECT * FROM t WHERE c = \${table}\`);`,
        errors: REPORTED,
      },
      {
        name: 'a destructured parameter with no type at all',
        code: `${KNEX}const run = ({ ms }) => knex.raw(\`SET LOCAL statement_timeout = \${ms}\`);`,
        errors: REPORTED,
      },
      {
        name: 'a member of an enum imported from a path alias is not opened',
        filename: FILE,
        code: `import knex from 'knex';\nimport { TableName } from '@app/db/schemas';\nknex.whereRaw(\`v.row_num > \${TableName.Project}\`);`,
        errors: REPORTED,
      },
      {
        name: 'an imported name that is not an enum',
        filename: FILE,
        code: `import knex from 'knex';\nimport { NOT_AN_ENUM } from '../schemas';\nknex.raw(\`SELECT * FROM t WHERE c = \${NOT_AN_ENUM}\`);`,
        errors: REPORTED,
      },
      {
        name: 'an imported enum whose member is computed at run time',
        filename: FILE,
        code: `import knex from 'knex';\nimport { Computed } from '../schemas';\nknex.raw(\`SELECT * FROM t WHERE c = \${Computed.Dyn}\`);`,
        errors: REPORTED,
      },
      {
        name: 'a value read back from the database is not a compile-time constant',
        code: `${KNEX}async function f() { const r = await knex.raw('SHOW statement_timeout'); const t = r.rows[0].statement_timeout; await knex.raw(\`SET statement_timeout = '\${t}'\`); }`,
        errors: REPORTED,
      },
    ],
  },
);
