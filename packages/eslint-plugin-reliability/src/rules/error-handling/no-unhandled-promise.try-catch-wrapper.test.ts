/**
 * An async function whose whole body is a try/catch that does not rethrow returns a
 * promise that cannot reject, so calling it without `await` or `.catch` is not a
 * floating rejection.
 *
 * Only the strict shape is accepted: the body is ONE `try` with a `catch`, and
 * neither the catch nor a finally can let a rejection out. A try/finally with no
 * catch, a catch that rethrows, and code ahead of the `try` all stay reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnhandledPromise as rule } from './no-unhandled-promise';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-unhandled-promise — try/catch-wrapped async callee (reliability)', () => {
  ruleTester.run('whole-body try-catch that does not rethrow', rule, {
    valid: [
      {
        name: 'sendEmail wrapper called fire-and-forget',
        // @found parse-community/parse-server src/Controllers/UserController.js:210 and :325 at a3f152f64dfa (sendEmail, line 406)
        code: `
          async function sendEmail(name, send) {
            try {
              await send();
            } catch (error) {
              logSendEmailError(name, error);
            }
          }
          export function notify(send) {
            sendEmail('verification', () => send());
          }
        `,
      },
      {
        name: 'arrow function bound to a const',
        // @found same shape as parse-server src/Controllers/UserController.js:406 at a3f152f64dfa, written as an arrow
        code: `
          const safe = async (send) => {
            try {
              await send();
            } catch (e) {
              console.error(e);
            }
          };
          export function go(send) {
            safe(send);
          }
        `,
      },
      {
        name: 'catch that returns nothing and a finally that only logs',
        // @found parse-community/parse-server src/Auth.js:88 at a3f152f64dfa (catch logs and falls through)
        code: `
          async function renew(x) {
            try {
              await x.run();
            } catch (e) {
              if (e.code !== 101) { console.error(e); }
            } finally {
              console.log('done');
            }
          }
          export function go(x) {
            renew(x);
          }
        `,
      },
      {
        name: 'async function expression bound to a const, catch returns a plain value',
        // @found same shape as parse-server src/Controllers/UserController.js:406 at a3f152f64dfa, as a function expression
        code: `
          const safe = async function (send) {
            try {
              await send();
            } catch (e) {
              return false;
            }
          };
          export function go(send) {
            safe(send);
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'catch rethrows',
        code: `
          async function work(send) {
            try {
              await send();
            } catch (e) {
              throw new Error('wrapped', { cause: e });
            }
          }
          export function go(send) {
            work(send);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'catch returns Promise.reject',
        code: `
          async function work(send) {
            try {
              await send();
            } catch (e) {
              return Promise.reject(e);
            }
          }
          export function go(send) {
            work(send);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'try/finally without a catch',
        code: `
          async function work(send) {
            try {
              await send();
            } finally {
              console.log('done');
            }
          }
          export function go(send) {
            work(send);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'a statement ahead of the try can throw into the promise',
        code: `
          async function work(req, send) {
            const limits = req.config.rateLimits;
            try {
              await send(limits);
            } catch (e) {
              console.error(e);
            }
          }
          export function go(req, send) {
            work(req, send);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'catch awaits more work that can reject',
        code: `
          async function work(send, cleanup) {
            try {
              await send();
            } catch (e) {
              await cleanup(e);
            }
          }
          export function go(send, cleanup) {
            work(send, cleanup);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'a single statement that is not a try',
        code: `
          async function work() { return 1; }
          export function go() {
            work(1);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'a finally that throws',
        code: `
          async function work(s) { try { await s(); } catch (e) { console.error(e); } finally { throw new Error("x"); } }
          export function go() {
            work(1);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'catch returns a call',
        code: `
          async function work(s) { try { await s(); } catch (e) { return report(e); } }
          export function go() {
            work(1);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'catch returns a new expression',
        code: `
          async function work(s) { try { await s(); } catch (e) { return new Error(String(e)); } }
          export function go() {
            work(1);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'catch uses computed Promise["reject"]',
        code: `
          async function work(s) { try { await s(); } catch (e) { return Promise["reject"](e); } }
          export function go() {
            work(1);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'expression-bodied async arrow',
        code: `
          const work = async (s) => s();
          export function go() {
            work(1);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'async generator',
        code: `
          async function* work(s) { try { yield await s(); } catch (e) { console.error(e); } }
          export function go() {
            work(1);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'catch builds a rejected promise through a computed key and hands it on',
        code: `
          async function work(send) {
            try {
              await send();
            } catch (e) {
              const failed = Promise['reject'](e);
              void failed;
            }
          }
          export function go(send) {
            work(send);
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
    ],
  });
});
