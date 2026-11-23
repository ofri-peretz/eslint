/**
 * @fileoverview Tests for no-fixed-sleep
 *
 * Only test files are read. The traps: a setTimeout that is not a sleep (a
 * real timer with a callback), a `sleep` that is not awaited or has a computed
 * duration, a local `setTimeout`, fake timers, and `cy.wait('@alias')`.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';

import { noFixedSleep } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const T = 'src/app.test.ts';

ruleTester.run('no-fixed-sleep', noFixedSleep, {
  valid: [
    {
      name: 'a sleep outside a test file is not read',
      filename: 'src/retry.ts',
      code: `await new Promise((r) => setTimeout(r, 500));`,
    },
    {
      name: 'a real timer with its own callback',
      filename: T,
      code: `new Promise((resolve) => setTimeout(() => { flush(); resolve(); }, 10));`,
    },
    {
      name: 'a timer whose callback is not the resolver',
      filename: T,
      code: `new Promise((resolve, reject) => setTimeout(reject, 10));`,
    },
    {
      name: 'a local setTimeout',
      filename: T,
      code: `const setTimeout = fake;\nnew Promise((r) => setTimeout(r, 10));`,
    },
    {
      name: 'a promise with more than one statement',
      filename: T,
      code: `new Promise((r) => { start(); setTimeout(r, 10); });`,
    },
    {
      name: 'a promise whose executor is not a function',
      filename: T,
      code: `new Promise(executor);`,
    },
    {
      name: 'a promise with a destructured parameter',
      filename: T,
      code: `new Promise(({ r }) => setTimeout(r, 10));`,
    },
    {
      name: 'a promise with no parameters',
      filename: T,
      code: `new Promise(() => setTimeout(done, 10));`,
    },
    {
      name: 'a promise whose body calls something else',
      filename: T,
      code: `new Promise((r) => queueMicrotask(r));`,
    },
    {
      name: 'a promise whose body is not a call',
      filename: T,
      code: `new Promise((r) => r);`,
    },
    {
      name: 'a promise whose body is a member call',
      filename: T,
      code: `new Promise((r) => timers.setTimeout(r, 1));`,
    },
    {
      name: 'a timer with no callback',
      filename: T,
      code: `new Promise((r) => setTimeout());`,
    },
    {
      name: 'a timer callback that does something else',
      filename: T,
      code: `new Promise((r) => setTimeout(() => other(), 1));`,
    },
    {
      name: 'a timer callback that is not a function',
      filename: T,
      code: `new Promise((r) => setTimeout(r.bind(null), 1));`,
    },
    {
      name: 'a block statement that is not an expression',
      filename: T,
      code: `new Promise((r) => { return; });`,
    },
    {
      name: 'something other than Promise',
      filename: T,
      code: `new Thing((r) => setTimeout(r, 1));\nnew ns.Promise((r) => setTimeout(r, 1));`,
    },
    {
      name: 'fake timers are not sleeps',
      filename: T,
      code: `vi.useFakeTimers();\nawait vi.advanceTimersByTimeAsync(1000);`,
    },
    {
      name: 'a sleep helper that is not awaited',
      filename: T,
      code: `sleep(100);`,
    },
    {
      name: 'a sleep helper with a computed duration',
      filename: T,
      code: `await delay(backoff(attempt));`,
    },
    {
      name: 'a sleep helper with no argument',
      filename: T,
      code: `await wait();`,
    },
    {
      name: 'Cypress alias waits are event waits',
      filename: 'cypress/e2e/login.cy.ts',
      code: `cy.wait('@login');`,
    },
    {
      name: 'a wait method on another object',
      filename: T,
      code: `await queue.wait(100);\nawait other.wait(100);`,
    },
    {
      name: 'a setTimeout imported from elsewhere',
      filename: T,
      code: `import { setTimeout } from './timers';\nawait setTimeout(100);`,
    },
    {
      name: 'a default import from timers/promises is not read',
      filename: T,
      code: `import timers from 'node:timers/promises';\nawait timers.setTimeout(100);`,
    },
    {
      name: 'a default or namespace import from timers/promises is not a named timer',
      filename: T,
      code: `import nap from 'node:timers/promises';\nimport * as t from 'timers/promises';\nawait nap(100);\nawait t.wait(100);`,
    },
    {
      name: 'a computed member that is not a static string is not read',
      filename: T,
      code: `await page[method](100);`,
    },
    {
      name: 'a call on a call',
      filename: T,
      code: `await make()(100);`,
    },
    {
      name: 'a string arithmetic duration is not a number',
      filename: T,
      code: `await sleep('1' + 'x');`,
    },
  ],
  invalid: [
    {
      name: 'await new Promise((r) => setTimeout(r, 500))',
      filename: T,
      code: `await new Promise((r) => setTimeout(r, 500));`,
      errors: [{ messageId: 'fixedSleep', data: { how: 'setTimeout' } }],
    },
    {
      name: 'a function executor with a block body and a wrapped resolver',
      filename: 'test/app.ts',
      code: `await new Promise(function (resolve) { setTimeout(() => resolve(), 100); });`,
      errors: [{ messageId: 'fixedSleep' }],
    },
    {
      name: 'a function-expression callback',
      filename: T,
      code: `await new Promise((r) => setTimeout(function () { r(); }, 100));`,
      errors: [{ messageId: 'fixedSleep' }],
    },
    {
      name: 'setTimeout from node:timers/promises',
      filename: T,
      code: `import { setTimeout } from 'node:timers/promises';\nawait setTimeout(100);`,
      errors: [
        {
          messageId: 'fixedSleep',
          data: { how: 'setTimeout() from timers/promises' },
        },
      ],
    },
    {
      name: 'scheduler.wait from timers/promises',
      filename: T,
      code: `import { scheduler } from 'timers/promises';\nawait scheduler.wait(100);`,
      errors: [{ messageId: 'fixedSleep', data: { how: 'scheduler.wait()' } }],
    },
    {
      name: 'a string-literal import name',
      filename: T,
      code: `import { 'setTimeout' as nap } from 'node:timers/promises';\nawait nap(100);`,
      errors: [{ messageId: 'fixedSleep' }],
    },
    {
      name: 'an awaited sleep helper',
      filename: T,
      code: `await sleep(500);`,
      errors: [{ messageId: 'fixedSleep', data: { how: 'sleep()' } }],
    },
    {
      name: 'an awaited delay with arithmetic',
      filename: T,
      code: `await delay(2 * 1000);`,
      errors: [{ messageId: 'fixedSleep', data: { how: 'delay()' } }],
    },
    {
      name: 'Playwright waitForTimeout',
      filename: 'e2e/home.spec.ts',
      code: `await page.waitForTimeout(1000);`,
      errors: [{ messageId: 'fixedSleep', data: { how: 'waitForTimeout()' } }],
    },
    {
      name: 'a computed string member is the same method',
      filename: T,
      code: `await page['waitForTimeout'](100);`,
      errors: [{ messageId: 'fixedSleep' }],
    },
    {
      name: 'Cypress numeric wait',
      filename: 'cypress/e2e/login.cy.ts',
      code: `cy.wait(500);`,
      errors: [{ messageId: 'fixedSleep', data: { how: 'cy.wait()' } }],
    },
  ],
});
