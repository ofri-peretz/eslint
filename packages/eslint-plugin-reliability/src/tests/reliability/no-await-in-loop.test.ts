/**
 * Tests for no-await-in-loop rule
 * Disallow await inside loops without considering concurrency implications
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAwaitInLoop } from '../../rules/reliability/no-await-in-loop';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-await-in-loop', () => {
  describe('valid patterns', () => {
    ruleTester.run('allow non-awaited loops', noAwaitInLoop, {
      valid: [
        // No await in loop
        {
          code: `
            for (const item of items) {
              process(item);
            }
          `,
        },
        // Await outside loop
        {
          code: `
            await beforeLoop();
            for (const item of items) {
              process(item);
            }
            await afterLoop();
          `,
        },
        // Using Promise.all (correct pattern)
        {
          code: `
            await Promise.all(items.map(async (item) => {
              await processItem(item);
            }));
          `,
        },
        // Await in nested function (different scope)
        {
          code: `
            for (const item of items) {
              const handler = async () => await processItem(item);
              handlers.push(handler);
            }
          `,
        },
        // for-of allowed with option
        {
          code: `
            for (const item of items) {
              await process(item);
            }
          `,
          options: [{ allowForOf: true }],
        },
        // while allowed with option  
        {
          code: `
            while (condition) {
              await process();
            }
          `,
          options: [{ allowWhile: true }],
        },
      ],
      invalid: [
        // for-of with await
        {
          code: `
            for (const item of items) {
              await process(item);
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // for loop with await
        {
          code: `
            for (let i = 0; i < items.length; i++) {
              await process(items[i]);
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // while loop with await
        {
          code: `
            while (hasMore()) {
              await fetchNext();
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // do-while with await
        {
          code: `
            do {
              await fetchPage();
            } while (hasNextPage());
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Multiple awaits in loop
        {
          code: `
            for (const item of items) {
              await validate(item);
              await save(item);
            }
          `,
          errors: [
            { messageId: 'awaitInLoop' },
            { messageId: 'awaitInLoop' },
          ],
        },
      ],
    });
  });
});
