/**
 * Tests for no-redundant-roles rule
 * Accessibility: Best Practice
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRedundantRoles } from '../rules/no-redundant-roles';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-redundant-roles', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no redundant roles', noRedundantRoles, {
      valid: [
      {
        /**
         * Not a miss — a default exception. `nav: ['navigation']` is in
         * `DEFAULT_ROLE_EXCEPTIONS`, matching jsx-a11y, because some assistive
         * technology historically needed the explicit role on `nav`.
         *
         * It was recorded as `FN:` first, on the assumption that the implicit
         * role was simply absent from the map. It is in the map; the exception
         * list is what stops the report. A rule that declines on purpose and a
         * rule that cannot see are different facts and the database has to tell
         * them apart.
         */
        name: 'nav with an explicit navigation role — allowed by default',
        code: '<nav role="navigation"></nav>',
      },
        { name: 'no explicit role', code: '<button>Click</button>' },
        { code: '<a href="#">Link</a>' },
        { code: '<nav></nav>' },
        { code: '<main></main>' },
        { code: '<div role="button"></div>' },
        { code: '<span role="link"></span>' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - redundant roles', noRedundantRoles, {
      valid: [],
      invalid: [
      {
        // The proof that the case above is a policy and not a blindness:
        // clear the exception and the same markup reports.
        name: 'nav with an explicit navigation role, once the exception is cleared',
        code: '<nav role="navigation"></nav>',
        options: [{ nav: [] }],
        errors: [{ messageId: 'redundantRole' }],
      },
        { name: "role='main' on a main element", code: '<main role="main"></main>', errors: [{ messageId: 'redundantRole' }] },
        { code: '<article role="article"></article>', errors: [{ messageId: 'redundantRole' }] },
      ],
    });
  });
});
