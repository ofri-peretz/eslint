/**
 * Comprehensive tests for no-unchecked-loop-condition rule
 * Security: CWE-400 (Uncontrolled Resource Consumption), CWE-606 (Unchecked Input for Loop Condition)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUncheckedLoopCondition } from '../../rules/security/no-unchecked-loop-condition';

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

describe('no-unchecked-loop-condition', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe loop conditions', noUncheckedLoopCondition, {
      valid: [
        // Safe for loops with clear bounds
        {
          code: 'for (let i = 0; i < 10; i++) { console.log(i); }',
        },
        {
          code: 'for (let i = 0; i < items.length; i++) { processItem(items[i]); }',
        },
        // Safe while loops with conditions
        {
          code: 'while (condition && attempts < 3) { attemptOperation(); attempts++; }',
        },
        // While true with break (allowed by default)
        {
          code: 'while (true) { processData(); if (shouldStop) break; }',
        },
        // Safe recursion with depth limit
        {
          code: 'function factorial(n, depth = 0) { if (depth > 10) return 1; return n * factorial(n-1, depth+1); }',
        },
        // Controlled iterations
        {
          code: 'const maxIterations = 100; for (let i = 0; i < maxIterations; i++) { /* work */ }',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Infinite Loops', () => {
    ruleTester.run('invalid - infinite loop patterns', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'for (;;) { console.log("infinite"); }',
          errors: [
            {
              messageId: 'infiniteLoop',
            },
          ],
        },
        {
          code: 'while (true) { /* no break */ }',
          options: [{ allowWhileTrueWithBreak: false }],
          errors: [
            {
              messageId: 'infiniteLoop',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - User Controlled Loop Bounds', () => {
    ruleTester.run('invalid - user controlled loop conditions', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'for (let i = 0; i < req.query.limit; i++) { processItem(); }',
          errors: [
            {
              messageId: 'userControlledLoopBound',
            },
          ],
        },
        {
          code: 'while (userInput-- > 0) { doWork(); }',
          errors: [
            {
              messageId: 'userControlledLoopBound',
            },
          ],
        },
        {
          code: 'const iterations = req.body.count; for (let i = 0; i < iterations; i++) { /* work */ }',
          errors: [
            {
              messageId: 'userControlledLoopBound',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Large Loop Bounds', () => {
    ruleTester.run('invalid - potentially large iteration counts', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'for (let i = 0; i < 100000; i++) { processItem(); }',
          errors: [
            {
              messageId: 'largeLoopBound',
            },
          ],
        },
        {
          code: 'for (let i = 0; i <= 50000; i++) { /* work */ }',
          errors: [
            {
              messageId: 'largeLoopBound',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Loop Termination', () => {
    ruleTester.run('invalid - missing loop termination conditions', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'for (let i = 0; ; i++) { if (i > 10) break; }', // Missing condition in for loop
          errors: [
            {
              messageId: 'missingLoopTermination',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unsafe Recursion', () => {
    ruleTester.run('invalid - unsafe recursive functions', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: `
            function recursiveFunc(n) {
              if (n > 0) {
                recursiveFunc(n - 1); // Recursion without depth limit
                recursiveFunc(n - 1);
                recursiveFunc(n - 1);
                recursiveFunc(n - 1);
                recursiveFunc(n - 1);
                recursiveFunc(n - 1);
                recursiveFunc(n - 1);
                recursiveFunc(n - 1);
                recursiveFunc(n - 1);
                recursiveFunc(n - 1);
                recursiveFunc(n - 1);
                recursiveFunc(n - 1);
              }
            }
          `,
          errors: [
            {
              messageId: 'unsafeRecursion',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unchecked Collections', () => {
    ruleTester.run('invalid - iteration over unchecked collections', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'for (const item of req.body.items) { processItem(item); }',
          errors: [
            {
              messageId: 'uncheckedLoopCondition',
            },
          ],
        },
        {
          code: 'for (const key in userInput) { console.log(key); }',
          errors: [
            {
              messageId: 'uncheckedLoopCondition',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noUncheckedLoopCondition, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @safe-loop */
            while (true) {
              processData();
              if (shouldStop) break;
            }
          `,
        },
        // Controlled user input
        {
          code: `
            const safeLimit = Math.min(req.query.limit, 100);
            for (let i = 0; i < safeLimit; i++) { /* work */ }
          `,
        },
        // Validated collections
        {
          code: `
            if (Array.isArray(req.body.items) && req.body.items.length < 100) {
              for (const item of req.body.items) { processItem(item); }
            }
          `,
        },
        // Small iteration counts
        {
          code: 'for (let i = 0; i < 100; i++) { /* safe small loop */ }',
        },
        // Controlled recursion
        {
          code: `
            function safeRecursion(n, depth = 0) {
              if (depth > 10) return; // Depth limit
              if (n > 0) safeRecursion(n - 1, depth + 1);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom max iterations', noUncheckedLoopCondition, {
      valid: [
        {
          code: 'for (let i = 0; i < 500; i++) { /* within limit */ }',
          options: [{ maxStaticIterations: 1000 }],
        },
      ],
      invalid: [
        {
          code: 'for (let i = 0; i < 1500; i++) { /* exceeds limit */ }',
          options: [{ maxStaticIterations: 1000 }],
          errors: [
            {
              messageId: 'largeLoopBound',
            },
          ],
        },
      ],
    });

    ruleTester.run('config - custom user input variables', noUncheckedLoopCondition, {
      valid: [
        {
          code: 'for (let i = 0; i < customInput; i++) { /* not flagged */ }',
          options: [{ userInputVariables: ['otherInput'] }],
        },
      ],
      invalid: [
        {
          code: 'while (customInput-- > 0) { /* flagged */ }',
          options: [{ userInputVariables: ['customInput'] }],
          errors: [
            {
              messageId: 'userControlledLoopBound',
            },
          ],
        },
      ],
    });

    ruleTester.run('config - disable while true with break', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'while (true) { processData(); if (done) break; }',
          options: [{ allowWhileTrueWithBreak: false }],
          errors: [
            {
              messageId: 'infiniteLoop',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Loop Condition Scenarios', () => {
    ruleTester.run('complex - real-world DoS loop patterns', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: `
            // ReDoS through user-controlled regex in loop
            app.post('/search', (req, res) => {
              const pattern = req.body.pattern;
              const text = req.body.text;

              // DANGEROUS: Loop controlled by regex that could cause catastrophic backtracking
              while (text.match(pattern)) {
                text = text.replace(pattern, '');
              }

              res.json({ result: text });
            });
          `,
          errors: [
            {
              messageId: 'userControlledLoopBound',
            },
          ],
        },
        {
          code: `
            // Resource exhaustion through large array operations
            function processLargeArray(req, res) {
              const data = req.body.data; // Could be millions of items

              // DANGEROUS: No size limit on iteration
              for (const item of data) {
                expensiveOperation(item);
              }

              res.json({ processed: data.length });
            }
          `,
          errors: [
            {
              messageId: 'uncheckedLoopCondition',
            },
          ],
        },
        {
          code: `
            // Infinite loop through state-dependent condition
            let shouldContinue = true;

            function processQueue() {
              // DANGEROUS: Condition depends on external state that may never change
              while (shouldContinue) {
                const item = queue.shift();
                if (!item) {
                  // Forgot to set shouldContinue = false!
                  continue;
                }
                processItem(item);
              }
            }
          `,
          errors: [
            {
              messageId: 'infiniteLoop',
            },
          ],
        },
        {
          code: `
            // Stack overflow through uncontrolled recursion
            function traverseObject(obj, path = []) {
              // DANGEROUS: No recursion depth limit
              for (const key in obj) {
                const value = obj[key];
                const currentPath = [...path, key];

                if (typeof value === 'object' && value !== null) {
                  // Deeply nested objects could cause stack overflow
                  traverseObject(value, currentPath);
                } else {
                  processLeaf(currentPath, value);
                }
              }
            }
          `,
          errors: [
            {
              messageId: 'unsafeRecursion',
            },
          ],
        },
        {
          code: `
            // DoS through user-controlled iteration bounds
            app.get('/paginate', (req, res) => {
              const pageSize = parseInt(req.query.pageSize) || 10;
              const page = parseInt(req.query.page) || 0;

              // DANGEROUS: pageSize could be 1e9, page could be negative
              const startIndex = page * pageSize;
              const endIndex = startIndex + pageSize;

              const results = [];
              for (let i = startIndex; i < endIndex; i++) {
                if (i >= allData.length) break; // Too late!
                results.push(allData[i]);
              }

              res.json(results);
            });
          `,
          errors: [
            {
              messageId: 'userControlledLoopBound',
            },
          ],
        },
      ],
    });
  });
});
