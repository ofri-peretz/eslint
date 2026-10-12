/**
 * Tests for sequelize-security/no-mass-assignment
 * CWE-915 — the request object written straight to the database.
 *
 * This rule shipped with no invalid case anywhere in the suite, so nothing
 * demonstrated that it ever reported. The factory behind it
 * (`createMassAssignmentRule`) is covered in eslint-devkit; what was missing is
 * proof that THIS plugin's wiring — its methods, receiver pattern and module
 * gate — actually fires on sequelize code.
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
 * The module gate, and a model. `model` used to be left undeclared and
 * recognised by its NAME (`/[Mm]odel$/`); it is now a model because it is
 * defined on the Sequelize instance — `foo` would do exactly as well.
 */
const DRIVER = `import { Sequelize } from 'sequelize';\nconst sequelize = new Sequelize('sqlite::memory:');\nconst model = sequelize.define('User', {});\n`;

describe('no-mass-assignment', () => {
  ruleTester.run('no-mass-assignment', noMassAssignment, {
    valid: [
      {
        name: 'the fix — every field named explicitly',
        code: DRIVER + `await model.create({ name: req.body.name });`,
      },
      {
        name: 'a value the rule cannot classify is not assumed hostile',
        code: DRIVER + `await model.create(validated);`,
      },
      {
        name: 'a spread of something that is not the request',
        code: DRIVER + `await model.create({ ...defaults });`,
      },
      {
        // The module gate is the whole reason this plugin exists separately:
        // the same call shape in a file that never imports sequelize is
        // somebody else's API, not this one.
        name: 'silent without the driver import',
        code: `await model.create(req.body);`,
      },
    ],
    invalid: [
      {
        // A third shape rather than a second spelling of the first: the rule's
        // position is 'the request object', and `req.body` is only one door into it.
        name: 'the query string is the request too, not just the body',
        code: DRIVER + `await model.create(req.query);`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'the request object written straight through',
        code: DRIVER + `await model.create(req.body);`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'spreading the request carries every key it happens to hold',
        code: DRIVER + `await model.create({ ...req.body });`,
        errors: [{ messageId: 'untrustedSpread' }],
      },
    ],
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-sequelize-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-mass-assignment — fp/fn review 2026-10', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sequelize-ma-'));
  // The sequelize-cli models/index.js shape: models attached in a loop the walk
  // cannot read, from a module that loads Sequelize itself.
  fs.writeFileSync(
    path.join(dir, 'models.js'),
    "const { Sequelize } = require('sequelize');\nconst db = {};\nconst sequelize = new Sequelize(process.env.DATABASE_URL);\nfor (const m of []) db[m.name] = m;\ndb.sequelize = sequelize;\nmodule.exports = db;\n",
  );
  const ROUTE = path.join(dir, 'routes.js');
  const S =
    "import { Sequelize, Model, DataTypes } from 'sequelize';\nconst foo = new Sequelize('sqlite::memory:');\nclass Bar extends Model {}\nBar.init({ title: DataTypes.STRING }, { sequelize: foo });\n";

  ruleTester.run('fp-fn review 2026-10', noMassAssignment, {
    valid: [
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (fields allowlist)
        name: "FP: Sequelize's own `fields` allowlist",
        code:
          DRIVER +
          "const UserModel = sequelize.define('U', {});\nexport const h = (req) => UserModel.create(req.body, { fields: ['name'] });",
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (URLSearchParams.set)
        name: 'FP: URLSearchParams.set with a request value',
        code:
          S +
          "export const h = (req) => { const db = new URL('https://x').searchParams; db.set('q', req.query); };",
      },
    ],
    invalid: [
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (class extends Model)
        name: 'FN: a model class that extends Model, named anything',
        code: S + 'export const h = (baz) => Bar.create(baz.body);',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (instance update / set)
        name: 'FN: an instance found through the model',
        code:
          S +
          'export async function h(baz) { const qux = await Bar.findByPk(1); await qux.update(baz.body); qux.set(baz.body); }',
        errors: [
          { messageId: 'untrustedPayload' },
          { messageId: 'untrustedPayload' },
        ],
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (bulkCreate / build)
        name: 'FN: bulkCreate and build',
        code:
          S +
          'export const h = (baz) => { Bar.bulkCreate(baz.body); return Bar.build(baz.body); };',
        errors: [
          { messageId: 'untrustedPayload' },
          { messageId: 'untrustedPayload' },
        ],
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (Object.assign onto an instance)
        name: 'FN: the request copied onto a model instance before save()',
        code:
          S +
          'export async function h(baz) { const qux = await Bar.findByPk(1); Object.assign(qux, baz.body); await qux.save(); }',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (sequelize-cli models)
        name: "FN: a model read off sequelize-cli's models/index.js",
        filename: ROUTE,
        code: "const { User: foo } = require('./models');\nmodule.exports = (bar) => foo.create(bar.body);",
        errors: [{ messageId: 'untrustedPayload' }],
      },
    ],
  });
});
