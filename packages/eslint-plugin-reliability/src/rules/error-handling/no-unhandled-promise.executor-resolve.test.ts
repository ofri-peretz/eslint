/**
 * `new Promise((resolve) => resolve(p))`: `resolve` adopts `p`, so a rejection of `p`
 * settles the OUTER promise instead of floating. Only that one shape is accepted: the
 * executor's first parameter, called with the promise as its sole argument. `reject(p)`,
 * a promise given to any other call, a second-parameter `resolve` and a shadowed
 * `resolve` all stay reported.
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

describe('no-unhandled-promise — promise adopted by the executor resolve (reliability)', () => {
  ruleTester.run('resolve(p) in a new Promise executor', rule, {
    valid: [
      {
        name: 'FP: store call handed to the executor resolve, so its rejection settles the outer promise',
        // @source nestjs/locks lib/utils/store-call.util.ts:25 @ 67c32c50a03a17c38e6382fdb77f2058daf04fc9
        // @found real-source scan
        code: `
          export function storeCall<T>(call: () => Promise<T>): Promise<T> {
            const answer = new Promise<T>((resolve) => resolve(call()));
            return answer;
          }
        `,
      },
      {
        name: 'function-expression executor adopts through a renamed first parameter',
        // @found spelling probe
        code: `
          export function wrap(call: () => Promise<number>) {
            return new Promise<number>(function (done) {
              done(call());
            });
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'reject(p) makes the promise a reason and never settles it',
        code: `
          export function f(call: () => Promise<number>) {
            return new Promise((resolve, reject) => reject(call()));
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'a promise passed to console.log is not adopted by anything',
        code: `
          export function f(call: () => Promise<number>) {
            return new Promise<void>((resolve) => {
              console.log(call());
              resolve();
            });
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'resolve that is the second executor parameter is reject, not resolve',
        code: `
          export function f(call: () => Promise<number>) {
            return new Promise((first, resolve) => resolve(call()));
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'resolve outside any Promise executor adopts nothing',
        code: `
          export function f(call: () => Promise<number>, resolve: (v: unknown) => void) {
            resolve(call());
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'a shadowing resolve inside the executor is not the executor parameter',
        code: `
          export function f(call: () => Promise<number>) {
            return new Promise((resolve) => {
              const log = (resolve: (v: unknown) => void) => resolve(call());
              log(console.log);
              resolve(1);
            });
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'resolve given the promise plus a second argument is not the sole-argument adoption',
        code: `
          export function f(call: () => Promise<number>) {
            return new Promise((resolve) => resolve(call(), 1));
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'executor of a non-Promise constructor',
        code: `
          export function f(call: () => Promise<number>) {
            return new Deferred((resolve) => resolve(call()));
          }
        `,
        errors: [{ messageId: 'unhandledPromise' }],
      },
    ],
  });
});
