/**
 * Comprehensive tests for no-await-in-loop rule
 * Disallow await inside loops and suggest appropriate concurrency patterns
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAwaitInLoop } from '../rules/architecture/no-await-in-loop';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-await-in-loop', () => {
  describe('Basic loop types', () => {
    ruleTester.run('detect await in for loops', noAwaitInLoop, {
      valid: [
        // No await in loops
        { code: 'for (let i = 0; i < 10; i++) { console.log(i); }' },
        { code: 'for (const item of items) { syncOperation(item); }' },
        { code: 'while (condition) { doSomething(); }' },
        // Await outside loops
        { code: 'async function func() { await doSomething(); for (let i = 0; i < 10; i++) { console.log(i); } }' },
      ],
      invalid: [
        // Await in for loop
        {
          code: 'for (let i = 0; i < 10; i++) { await doSomething(i); }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Await in for-of loop
        {
          code: 'for (const item of items) { await processItem(item); }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Await in for-in loop
        {
          code: 'for (const key in obj) { await processKey(key); }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Await in while loop
        {
          code: 'while (condition) { await asyncOperation(); }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Await in do-while loop
        {
          code: 'do { await operation(); } while (condition);',
          errors: [{ messageId: 'awaitInLoop' }],
        },
      ],
    });
  });

  describe('Allow specific loop types', () => {
    ruleTester.run('allow for-of loops', noAwaitInLoop, {
      valid: [
        // Allowed with option
        {
          code: 'for (const item of items) { await processItem(item); }',
          options: [{ allowForOf: true }],
        },
        // No await - always valid
        { code: 'for (let i = 0; i < 10; i++) { console.log(i); }' },
      ],
      invalid: [
        // Still invalid for regular for loops
        {
          code: 'for (let i = 0; i < 10; i++) { await doSomething(i); }',
          options: [{ allowForOf: true }],
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Still invalid for while loops
        {
          code: 'while (condition) { await asyncOperation(); }',
          options: [{ allowForOf: true }],
          errors: [{ messageId: 'awaitInLoop' }],
        },
      ],
    });

    ruleTester.run('allow while loops', noAwaitInLoop, {
      valid: [
        // Allowed with option
        {
          code: 'while (condition) { await asyncOperation(); }',
          options: [{ allowWhile: true }],
        },
        // No await - always valid
        { code: 'for (let i = 0; i < 10; i++) { console.log(i); }' },
      ],
      invalid: [
        // Still invalid for regular for loops
        {
          code: 'for (let i = 0; i < 10; i++) { await doSomething(i); }',
          options: [{ allowWhile: true }],
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Still invalid for for-of loops
        {
          code: 'for (const item of items) { await processItem(item); }',
          options: [{ allowWhile: true }],
          errors: [{ messageId: 'awaitInLoop' }],
        },
      ],
    });

    ruleTester.run('allow multiple loop types', noAwaitInLoop, {
      valid: [
        // Both allowed with options
        {
          code: 'for (const item of items) { await processItem(item); }',
          options: [{ allowForOf: true, allowWhile: true }],
        },
        {
          code: 'while (condition) { await asyncOperation(); }',
          options: [{ allowForOf: true, allowWhile: true }],
        },
        { code: 'for (let i = 0; i < 10; i++) { console.log(i); }' },
      ],
      invalid: [
        // Still invalid for regular for loops
        {
          code: 'for (let i = 0; i < 10; i++) { await doSomething(i); }',
          options: [{ allowForOf: true, allowWhile: true }],
          errors: [{ messageId: 'awaitInLoop' }],
        },
      ],
    });
  });

  describe('Concurrency analysis', () => {
    ruleTester.run('detect sequential operations', noAwaitInLoop, {
      valid: [],
      invalid: [
        // Operations with dependencies - sequential
        {
          code: `
            let result = 0;
            for (const item of items) {
              result += await processItem(item);
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Push operations
        {
          code: `
            const results = [];
            for (const item of items) {
              results.push(await processItem(item));
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
      ],
    });

    ruleTester.run('detect concurrent opportunities', noAwaitInLoop, {
      valid: [],
      invalid: [
        // Independent operations - can be concurrent
        {
          code: `
            for (const item of items) {
              await processItem(item);
              console.log('processed');
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Multiple independent awaits
        {
          code: `
            for (let i = 0; i < 5; i++) {
              await apiCall1(i);
              await apiCall2(i);
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }, { messageId: 'awaitInLoop' }],
        },
      ],
    });
  });

  describe('Nested loops and complex structures', () => {
    ruleTester.run('handle nested loops', noAwaitInLoop, {
      valid: [],
      invalid: [
        // Await in outer loop
        {
          code: `
            for (const item of items) {
              await processItem(item);
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Await in nested loops - reports for each loop level (outer + inner)
        {
          code: `
            for (const group of groups) {
              for (const item of group.items) {
                await processItem(item);
              }
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }, { messageId: 'awaitInLoop' }],
        },
      ],
    });

    ruleTester.run('handle loops in functions', noAwaitInLoop, {
      valid: [
        // Await inside nested async function (different scope)
        {
          code: `
            for (const item of items) {
              const processAsync = async () => {
                await doSomething(item);
              };
              processAsync();
            }
          `,
        },
      ],
      invalid: [
        // Direct await in loop
        {
          code: `
            for (const item of items) {
              await doSomething(item);
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
      ],
    });
  });

  describe('Performance implications', () => {
    ruleTester.run('detect performance issues', noAwaitInLoop, {
      valid: [],
      invalid: [
        // Simple case
        {
          code: 'for (const item of items) { await processItem(item); }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Multiple operations in loop - multiple errors
        {
          code: `
            for (let i = 0; i < 10; i++) {
              await apiCall1(i);
              await apiCall2(i);
              await apiCall3(i);
              await apiCall4(i);
              await apiCall5(i);
              await apiCall6(i);
            }
          `,
          errors: [
            { messageId: 'awaitInLoop' },
            { messageId: 'awaitInLoop' },
            { messageId: 'awaitInLoop' },
            { messageId: 'awaitInLoop' },
            { messageId: 'awaitInLoop' },
            { messageId: 'awaitInLoop' },
          ],
        },
      ],
    });
  });

  describe('TypeScript support', () => {
    ruleTester.run('handle TypeScript constructs', noAwaitInLoop, {
      valid: [
        // TypeScript async function without await in loop
        {
          code: `
            async function processItems(items: string[]) {
              for (const item of items) {
                console.log(item);
              }
            }
          `,
        },
      ],
      invalid: [
        // TypeScript async function with await in loop
        {
          code: `
            async function processItems(items: string[]): Promise<void> {
              for (const item of items) {
                await processItem(item);
              }
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Generic async function
        {
          code: `
            async function processList<T>(list: T[]): Promise<T[]> {
              const results: T[] = [];
              for (const item of list) {
                results.push(await transformItem(item));
              }
              return results;
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', noAwaitInLoop, {
      valid: [
        // Await not in loop
        { code: 'await doSomething();' },
        // Await in condition (before loop body)
        {
          code: `
            if (await checkCondition()) {
              doSomething();
            }
          `,
        },
      ],
      invalid: [
        // Await in loop condition
        {
          code: 'while (await checkCondition()) { doSomething(); }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Await in for loop parts
        {
          code: 'for (let i = 0; await getNextIndex(i); i++) { doSomething(); }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Complex await in for loop parts
        {
          code: `
            for (let i = await getStartIndex(); i < await getEndIndex(); await incrementIndex(i)) {
              await processItem(i);
            }
          `,
          errors: [
            { messageId: 'awaitInLoop' },
            { messageId: 'awaitInLoop' },
            { messageId: 'awaitInLoop' },
            { messageId: 'awaitInLoop' },
          ],
        },
      ],
    });
  });
});
