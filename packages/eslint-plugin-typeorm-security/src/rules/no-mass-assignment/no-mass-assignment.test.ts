/**
 * Tests for typeorm-security/no-mass-assignment
 * CWE-915 — the request object written straight to the database.
 *
 * This rule shipped with no invalid case anywhere in the suite, so nothing
 * demonstrated that it ever reported. The factory behind it
 * (`createMassAssignmentRule`) is covered in eslint-devkit; what was missing is
 * proof that THIS plugin's wiring — its methods, receiver pattern and module
 * gate — actually fires on typeorm code.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noMassAssignment } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

/**
 * The module gate, and a repository. `repository` used to be left undeclared
 * and recognised by its NAME (`/[Rr]epository$/`); it is now a repository
 * because it is read off a DataSource — `foo` would do exactly as well.
 */
const DRIVER = `import { DataSource } from 'typeorm';\nconst repository = new DataSource({ type: 'sqlite', database: ':memory:' }).getRepository('User');\n`;

describe('no-mass-assignment', () => {
  ruleTester.run('no-mass-assignment', noMassAssignment, {
    valid: [
      {
        name: 'the fix — every field named explicitly',
        code:
          DRIVER +
          `await repository.save({ name: req.body.name, email: req.body.email });`,
      },
      {
        name: 'a value the rule cannot classify is not assumed hostile',
        code: DRIVER + `await repository.save(validated);`,
      },
      {
        name: 'a spread of something that is not the request',
        code: DRIVER + `await repository.save({ ...defaults });`,
      },
      {
        // The module gate is the whole reason this plugin exists separately:
        // the same call shape in a file that never imports typeorm is
        // somebody else's API, not this one.
        name: 'silent without the driver import',
        code: `await repository.save(req.body);`,
      },
    ],
    invalid: [
      {
        // A third shape rather than a second spelling of the first: the rule's
        // position is 'the request object', and `req.body` is only one door into it.
        name: 'the query string is the request too, not just the body',
        code: DRIVER + `await repository.save(req.query);`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'the request object written straight through',
        code: DRIVER + `await repository.save(req.body);`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'spreading the request carries every key it happens to hold',
        code: DRIVER + `await repository.save({ ...req.body });`,
        errors: [{ messageId: 'untrustedSpread' }],
      },
    ],
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-typeorm-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-mass-assignment — fp/fn review 2026-10', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'typeorm-ma-'));
  fs.writeFileSync(
    path.join(dir, 'data-source.ts'),
    "import { DataSource } from 'typeorm';\nexport const AppDataSource = new DataSource({ type: 'postgres' });\n",
  );
  fs.writeFileSync(
    path.join(dir, 'user.entity.ts'),
    'export class User { id!: number; }\n',
  );
  const CONTROLLER = path.join(dir, 'controller.ts');
  const NEST =
    "import { Injectable } from '@nestjs/common';\nimport { InjectRepository } from '@nestjs/typeorm';\nimport { Repository, EntityManager } from 'typeorm';\nclass User {}\n";

  ruleTester.run('fp-fn review 2026-10', noMassAssignment, {
    valid: [
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (a hash named like a repository)
        name: 'FP: a crypto hash named like a repository',
        code:
          DRIVER +
          "import { createHash } from 'node:crypto';\nconst repo = createHash('sha256');\nexport const h = (req) => repo.update(req.body);",
      },
      {
        name: 'an entity built field by field',
        code:
          NEST +
          '@Injectable()\nexport class S { constructor(@InjectRepository(User) private readonly foo: Repository<User>) {}\n  h(bar) { return this.foo.save({ name: bar.body.name }); } }',
      },
    ],
    invalid: [
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (injected repository, any name)
        name: 'FN: an injected Repository<T>, named anything',
        code:
          NEST +
          '@Injectable()\nexport class S { constructor(@InjectRepository(User) private readonly foo: Repository<User>) {}\n  h(bar) { return this.foo.save(bar.body); } }',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found typeorm/typescript-express-example:src/controller/PostSaveAction.ts:14
        name: 'FN: a repository from the DataSource module, in a file that never imports typeorm',
        filename: CONTROLLER,
        code: "import { AppDataSource } from './data-source';\nimport { User } from './user.entity';\nexport async function h(foo, bar) { const baz = AppDataSource.getRepository(User); const qux = baz.create(foo.body); await baz.save(qux); bar.json(qux); }",
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (EntityManager.save(Entity, body))
        name: 'FN: EntityManager.save(Entity, body) and a transaction manager',
        code:
          NEST +
          'export async function h(foo: EntityManager, bar) { await foo.save(User, bar.body); await foo.transaction(async (baz) => { await baz.save(User, { ...bar.body }); }); }',
        errors: [
          { messageId: 'untrustedPayload' },
          { messageId: 'untrustedSpread' },
        ],
      },
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (Object.assign then save)
        name: 'FN: the request copied onto an entity, then saved',
        code:
          NEST +
          'export async function h(foo: Repository<User>, bar) { const baz = { id: 1 }; Object.assign(baz, bar.body); await foo.save(baz); }',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (Object.assign onto a created entity)
        name: 'FN: Object.assign onto an entity the repository created',
        code:
          NEST +
          'export async function h(foo: Repository<User>, bar) { const baz = foo.create(); Object.assign(baz, bar.body); await foo.save(baz); }',
        errors: [{ messageId: 'untrustedPayload' }],
      },
    ],
  });
});
