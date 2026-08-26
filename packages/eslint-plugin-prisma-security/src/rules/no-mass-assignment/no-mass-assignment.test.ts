/**
 * Tests for prisma-security/no-mass-assignment
 * CWE-915 — the request object written straight to the database.
 *
 * This rule shipped with no invalid case anywhere in the suite, so nothing
 * demonstrated that it ever reported. The factory behind it
 * (`createMassAssignmentRule`) is covered in eslint-devkit; what was missing is
 * proof that THIS plugin's wiring — its methods, receiver pattern and module
 * gate — actually fires on prisma code.
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
const DRIVER = `import { PrismaClient } from '@prisma/client';\n`;

describe('no-mass-assignment', () => {
  ruleTester.run('no-mass-assignment', noMassAssignment, {
    valid: [
      {
        name: 'the fix — every field named explicitly',
        code: DRIVER + `await prisma.user.create({ data: { name: req.body.name } });`,
      },
      {
        name: 'a value the rule cannot classify is not assumed hostile',
        code: DRIVER + `await prisma.create(validated);`,
      },
      {
        name: 'a spread of something that is not the request',
        code: DRIVER + `await prisma.create({ ...defaults });`,
      },
      {
        // The module gate is the whole reason this plugin exists separately:
        // the same call shape in a file that never imports @prisma/client is
        // somebody else's API, not this one.
        name: 'silent without the driver import',
        code: `await prisma.user.create({ data: req.body });`,
      },
    ],
    invalid: [
      {
        // A third shape rather than a second spelling of the first: the rule's
        // position is 'the request object', and `req.body` is only one door into it.
        name: 'the query string is the request too, not just the body',
        code: DRIVER + `await prisma.user.create({ data: req.query });`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'the request object written straight through',
        code: DRIVER + `await prisma.user.create({ data: req.body });`,
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'spreading the request carries every key it happens to hold',
        code: DRIVER + `await prisma.create({ ...req.body });`,
        errors: [{ messageId: 'untrustedSpread' }],
      },
    ],
  });
});
