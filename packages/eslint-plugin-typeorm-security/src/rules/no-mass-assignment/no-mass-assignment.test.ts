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

/** The module gate: without this import the rule must stay silent. */
const DRIVER = `import { DataSource } from 'typeorm';\n`;

describe('no-mass-assignment', () => {
  ruleTester.run('no-mass-assignment', noMassAssignment, {
    valid: [
      {
        name: 'the fix — every field named explicitly',
        code: DRIVER + `await repository.save({ name: req.body.name, email: req.body.email });`,
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
