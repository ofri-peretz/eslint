/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-19).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noLogInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-log-injection (mutation edges)', () => {
  ruleTester.run('no-log-injection', noLogInjection, {
    valid: [
      {
        name: 'arithmetic on a request field inside a concatenation is a number, not request text',
        code: "function h(req) { logger.info('page ' + (req.query.page - 1)); }",
      },
      {
        name: 'a .info() on a member that is not a logger receiver is not a log line',
        code: "function h(req) { this.cache.info('key ' + req.query.id); }",
      },
      {
        // @found Stryker mutation-survivor triage, 2026-10-19
        name: 'a local reassigned after its request initializer no longer carries the request value',
        code: "function h(req) { let name = req.query.name; name = name.replace(/[\\r\\n]/g, ''); logger.info('user ' + name); }",
      },
    ],
    invalid: [
      {
        name: 'a local bound once to a request field is still attributed',
        code: "function h(req) { let name = req.query.name; logger.info('user ' + name); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        // @found CodeRabbit review on #1270
        name: 'a write after the log line does not change what the log line read',
        code: "function h(req) { let name = req.query.name; logger.info('user ' + name); name = 'safe'; }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        // @found CodeRabbit review on #1270
        name: 'a local reassigned to another request field still carries request data',
        code: "function h(req) { let name = req.query.name; name = req.query.other; logger.info('user ' + name); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a request field nested in a parenthesised concatenation is a direct operand',
        code: "function h(req) { logger.info('a ' + ('b ' + req.query.name)); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
    ],
  });
});
