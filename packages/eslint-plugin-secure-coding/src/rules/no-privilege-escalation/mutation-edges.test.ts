/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noPrivilegeEscalation } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const escalation = [{ messageId: 'privilegeEscalation' as const }];

/** The request-read patterns match source text, so spacing and bracket keys count. */
const requestSpellings = [
  'req . body . role',
  "req[ 'body' ].role",
  "req['body'].role",
  'request . query . role',
  "request[ 'params' ].role",
  "request['body'].role",
];

describe('no-privilege-escalation (mutation edges)', () => {
  ruleTester.run('no-privilege-escalation', noPrivilegeEscalation, {
    valid: [
      {
        name: 'a dynamic key is not the role field',
        code: 'user[role] = req.body.value;',
      },
      {
        name: 'a guard clause that throws inside a block is a guard',
        code: "function f(user, req) { if (!isAdmin(user)) { throw new Error('denied'); } user.role = req.body.role; }",
      },
      {
        name: 'a parameter is not traced to a request',
        code: 'function f(user, role) { user.role = role; }',
      },
      {
        name: 'a dynamically keyed call is not a privilege operation',
        code: 'handlers[action](req.body.userId);',
      },
      {
        name: 'a privilege operation with only constant arguments is not user-controlled',
        code: "setRole(user, 'admin');",
      },
    ],
    invalid: [
      {
        name: 'a test file is checked unless allowInTests is set',
        filename: 'src/roles.test.ts',
        code: 'user.role = req.body.role;',
        errors: escalation,
      },
      ...requestSpellings.map((source) => ({
        name: `${source} is a request read`,
        code: `user.role = ${source};`,
        errors: escalation,
      })),
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a private #role field is the role field',
        code: 'class Account { #role; update(req) { this.#role = req.body.role; } }',
        errors: escalation,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a quoted role key in an object is the role field',
        code: "const update = { 'role': req.body.role };",
        errors: escalation,
      },
      {
        name: 'a ternary without a role check guards nothing',
        code: 'const update = ready ? { role: req.body.role } : {};',
        errors: escalation,
      },
      {
        name: 'a dynamically keyed wrapper call is not a role check',
        code: 'guards[kind](() => { user.role = req.body.role; });',
        errors: escalation,
      },
      {
        name: 'the binding is resolved by its own reference, not the first in scope',
        code: 'const other = 1; const requestedRole = req.body.role; member.role = requestedRole;',
        errors: escalation,
      },
      {
        name: 'the operation name in the message is lower-cased',
        code: 'userService.elevate(user, req.body.level);',
        errors: [
          {
            messageId: 'privilegeEscalation' as const,
            data: {
              issue:
                'Privilege operation (elevate) with user input without role validation',
            },
          },
        ],
      },
      {
        name: 'a mixed-case operation name is lower-cased in the message',
        code: 'userService.setRole(user, req.body.role);',
        errors: [
          {
            messageId: 'privilegeEscalation' as const,
            data: {
              issue:
                'Privilege operation (setrole) with user input without role validation',
            },
          },
        ],
      },
    ],
  });
});
