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
      {
        // @found CodeRabbit review on #1270
        name: 'the last straight-line write before the log line decides: request then safe is safe',
        code: "function h(req) { let name = req.query.name; name = 'safe'; logger.info('user ' + name); }",
      },
      {
        name: 'a write at the top of the loop body overwrites the request write from the previous turn',
        code: "function h(req, xs) { let name = req.query.a; for (const x of xs) { name = 'safe'; logger.info('user ' + name); name = req.query.b; } }",
      },
      {
        name: 'a compound write is not a request field, so the hop is not evidence',
        code: "function h(req) { let name = 'a'; name += req.query.b; logger.info('user ' + name); }",
      },
      {
        name: 'a straight-line safe write at module top level ends the walk back',
        code: "let name = req.query.a; name = 'safe'; logger.info('user ' + name);",
      },
      {
        name: 'a declaration inside the loop body runs again before every read',
        code: "function h(req, xs) { for (const x of xs) { let name = 'safe'; logger.info('user ' + name); name = req.query.b; } }",
      },
      {
        name: 'a request write after the loop never reaches a read inside it',
        code: "function h(req, xs) { let name = 'safe'; for (const x of xs) { logger.info('user ' + name); } name = req.query.b; }",
      },
      {
        name: 'an update write stores a number, not the request field',
        code: "function h(req) { let name = req.query.n; name++; logger.info('count ' + name); }",
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
        // @found CodeRabbit review on #1270
        name: 'an earlier safe write does not hide a later request write that reaches the log line',
        code: "function h(req) { let name = req.query.name; name = 'safe'; name = req.query.other; logger.info('user ' + name); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        // @found CodeRabbit review on #1270
        name: 'the last straight-line write before the log line decides: safe then request is request',
        code: "function h(req) { let name = 'safe'; name = req.query.other; logger.info('user ' + name); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a conditional safe write may not run, so the request initializer can still reach the log line',
        code: "function h(req, c) { let name = req.query.name; if (c) name = 'safe'; logger.info('user ' + name); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a conditional request write may reach the log line past a safe initializer',
        code: "function h(req, c) { let name = 'safe'; if (c) { name = req.query.other; } logger.info('user ' + name); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a write inside a closure may never run, so the request initializer still reaches the log line',
        code: "function h(req) { let name = req.query.name; const reset = () => { name = 'safe'; }; logger.info('user ' + name); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a request write later in the loop body reaches the log line on the next turn',
        code: "function h(req, xs) { let name = 'safe'; for (const x of xs) { logger.info('user ' + name); name = req.query.other; } }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a safe write in a braced branch may not run, so the request initializer still reaches',
        code: "function h(req, c) { let name = req.query.name; if (c) { name = 'safe'; } logger.info('user ' + name); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a read of the local between its write and the log line is not a write',
        code: "function h(req, res) { let name = req.query.name; res.locals.user = name; logger.info('user ' + name); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a for-loop initializer does not end the walk, and the loop carries the later write back',
        code: "function h(req) { for (let name = 'a', i = 0; i < 3; i++) { logger.info('user ' + name); name = req.query.b; } }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a while loop carries a later request write back to the read',
        code: "function h(req, c) { let name = 'safe'; while (c()) { logger.info('user ' + name); name = req.query.b; } }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a do-while loop carries a later request write back to the read',
        code: "function h(req, c) { let name = 'safe'; do { logger.info('user ' + name); name = req.query.b; } while (c()); }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a for-in loop carries a later request write back to the read',
        code: "function h(req, o) { let name = 'safe'; for (const k in o) { logger.info('user ' + name); name = req.query.b; } }",
        errors: [{ messageId: 'logInjection' as const }],
      },
      {
        name: 'a for-loop update may never run, so the request initializer still reaches a read after the loop',
        code: "function h(req, n) { let name = req.query.name; for (let i = 0; i < n; name = 'safe') { i++; } logger.info('user ' + name); }",
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
