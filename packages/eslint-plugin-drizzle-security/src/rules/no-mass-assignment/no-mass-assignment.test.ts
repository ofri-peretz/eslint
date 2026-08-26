/**
 * Tests for drizzle-security/no-mass-assignment
 * CWE-915 — the request object written straight to the database.
 *
 * This rule shipped with no invalid case anywhere in the suite, so nothing
 * demonstrated that it ever reported. The factory behind it
 * (`createMassAssignmentRule`) is covered in eslint-devkit; what was missing is
 * proof that THIS plugin's wiring — its methods, receiver pattern and module
 * gate — actually fires on drizzle code.
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
const DRIVER = `import { drizzle } from 'drizzle-orm';\n`;

describe('no-mass-assignment', () => {
  ruleTester.run('no-mass-assignment', noMassAssignment, {
    valid: [
      {
        name: 'the fix — every field named explicitly',
        code: DRIVER + `await db.insert(users).values({ name: req.body.name });`,
      },
      {
        name: 'a value the rule cannot classify is not assumed hostile',
        code: DRIVER + `await db.values(validated);`,
      },
      {
        name: 'a spread of something that is not the request',
        code: DRIVER + `await db.values({ ...defaults });`,
      },
      {
        // The module gate is the whole reason this plugin exists separately:
        // the same call shape in a file that never imports drizzle-orm is
        // somebody else's API, not this one.
        name: 'silent without the driver import',
        code: `await db.values(req.body);`,
      },
    ],
    invalid: [
      {
        name: 'the request object written straight through',
        code: DRIVER + `await db.values(req.body);`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'spreading the request carries every key it happens to hold',
        code: DRIVER + `await db.values({ ...req.body });`,
        errors: [{ messageId: 'untrustedSpread' }],
      },
    ],
  });
});
