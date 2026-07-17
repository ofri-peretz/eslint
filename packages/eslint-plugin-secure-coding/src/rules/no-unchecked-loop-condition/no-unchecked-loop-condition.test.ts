/**
 * Comprehensive tests for no-unchecked-loop-condition rule
 * Security: CWE-400 (Uncontrolled Resource Consumption), CWE-606 (Unchecked Input for Loop Condition)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noUncheckedLoopCondition } from './index';

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
        // Plain BinaryExpression while-test (not an Identifier, no user
        // input, no complex-DoS pattern) — falls through every WhileStatement
        // check including the final state-dependent Identifier guard, whose
        // false branch (non-Identifier test) is exercised here.
        {
          code: 'while (a < b) { advance(); }',
        },
        // Identifier while-test whose name does not match any of the
        // state-dependent-flag substrings ('continue'/'running'/'active'/
        // 'enabled') — exercises the false branch of that 4-way OR check
        // specifically (as opposed to the outer test.type !== 'Identifier'
        // branch covered above).
        {
          code: 'while (flag) { doWork(); }',
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

  describe('Invalid Code - Complex User Input Expressions', () => {
    ruleTester.run('invalid - complex expressions with user input', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'while (-userInput > 0) { /* UnaryExpression */ process(); }',
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
        {
          code: 'while (userInput++ < 100) { /* UpdateExpression */ process(); }',
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
        {
          code: 'while (!userInput) { /* UnaryExpression ! */ process(); }',
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
        {
          code: 'while (check(userInput)) { /* CallExpression with user input */ process(); }',
          errors: [{ messageId: 'userControlledLoopBound' }],
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
        // checkIfCollectionIsValidated walks up through IfStatement
        // ancestors looking for an Array.isArray(...) + .length guard; an
        // enclosing `if` that checks something unrelated to the collection
        // does not count as validation (exercises the outer `if`'s false
        // branch: no Array.isArray(collectionText) match at all).
        {
          code: `
            if (someUnrelatedFlag) {
              for (const item of req.body.items) { processItem(item); }
            }
          `,
          errors: [
            {
              messageId: 'uncheckedLoopCondition',
            },
          ],
        },
        // Array.isArray(...) present but no accompanying `.length`
        // comparison — exercises the inner guard's false branch (has the
        // isArray check, but not the length bound), so validation still
        // fails and the loop is reported.
        {
          code: `
            if (Array.isArray(req.body.items)) {
              for (const item of req.body.items) { processItem(item); }
            }
          `,
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
        // Same validation shape using >= instead of < — checkIfCollectionIsValidated's
        // length-comparison check is a 4-way `||` over <, >, <=, >=; the `<`
        // fixture above only exercises the first disjunct.
        {
          code: `
            if (Array.isArray(req.body.items) && req.body.items.length >= 0) {
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

  describe('Invalid Code - WhileStatement/DoWhileStatement gaps', () => {
    // `text.match(pattern)` (or `.test(`) is the only checkComplexDoSPatterns
    // shape exercised by the pre-existing "Complex Loop Condition Scenarios"
    // fixture, and it uses req-derived variable names that involvesUserInput
    // catches first — so the WhileStatement branch that reports after
    // checkComplexDoSPatterns returns true (as opposed to involvesUserInput)
    // was never reached. `cache`/`rx` are plain local names, not user input.
    ruleTester.run('invalid - WhileStatement complex-DoS pattern (non-user-input names)', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'while (cache.match(rx)) { cache = cache.replace(rx, \'\'); }',
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
      ],
    });

    // checkComplexDoSPatterns' pagination branch (`page` + `pageSize` both
    // present) and arithmetic-overflow branch (`*` with `pageSize`/`limit`)
    // are two independent early returns never hit by the `.match(`-based
    // fixture above, since that pattern satisfies the first `if` and
    // returns before reaching either of these.
    ruleTester.run('invalid - WhileStatement complex-DoS pagination pattern', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'while (page < pageSize) { advance(); }',
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
      ],
    });

    ruleTester.run('invalid - WhileStatement complex-DoS arithmetic-overflow pattern', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          // Uses `limit` (not `pageSize`) so the pagination branch's
          // `.includes('page')` check doesn't intercept it first — isolates
          // the arithmetic-overflow branch (`*` combined with `limit`).
          code: 'while (offset * limit < total) { advance(); }',
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
      ],
    });

    // do-while's userControlledLoopBound report path was only ever exercised
    // by a `/** @safe */`-annotated fixture (which short-circuits before
    // context.report), so the actual report call itself was never hit.
    ruleTester.run('invalid - DoWhileStatement user-controlled condition', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'do { doWork(); } while (userInput-- > 0);',
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
      ],
    });
  });

  describe('Valid Code - DoWhileStatement/ForOfStatement without user input', () => {
    // involvesUserInput()'s false branch (no user-input variable found) was
    // never exercised for DoWhileStatement or ForOfStatement — every
    // existing fixture for those loop types used a req/userInput-derived
    // condition or collection.
    ruleTester.run('valid - do-while with a plain non-user-input condition', noUncheckedLoopCondition, {
      valid: [
        {
          code: 'do { doWork(); } while (attempts < 3);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - for-of over a plain non-user-input collection', noUncheckedLoopCondition, {
      valid: [
        {
          code: 'for (const item of localItems) { processItem(item); }',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - WhileStatement state-dependent variable-name branches', () => {
    // The state-dependent-flag check is a 4-way `||` over `.includes(...)`
    // substring tests ('continue', 'running', 'active', 'enabled'); the
    // only existing fixture uses a name matching 'running', so the other
    // three disjuncts' true branches were never independently exercised.
    ruleTester.run('invalid - state-dependent flag named with "continue"', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'while (shouldContinue) { doWork(); }',
          errors: [{ messageId: 'infiniteLoop' }],
        },
      ],
    });

    ruleTester.run('invalid - state-dependent flag named with "active"', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'while (isActive) { doWork(); }',
          errors: [{ messageId: 'infiniteLoop' }],
        },
      ],
    });

    ruleTester.run('invalid - state-dependent flag named with "enabled"', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'while (isEnabled) { doWork(); }',
          errors: [{ messageId: 'infiniteLoop' }],
        },
      ],
    });
  });

  describe('Valid Code - VariableDeclaration taint-tracking isSanitized branches', () => {
    // isSanitized is a 5-way OR: Math.min(/Math.max(/parseInt(/parseFloat(/
    // are each covered elsewhere in this file, but the last disjunct
    // (initText contains BOTH '&&' AND '.length', e.g. a guarded/optional
    // access) was never independently exercised. When isSanitized is true
    // the variable is NOT added to taintedVariables, so a later use of that
    // variable in a condition that doesn't textually mention any
    // userInputVariables substring stays unflagged.
    ruleTester.run('valid - variable initializer guarded with "&&" and ".length" is treated as sanitized', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            const n = req.body.items && req.body.items.length;
            while (check(n)) { doWork(); }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - anonymous default-export FunctionDeclaration has no id', () => {
    // `export default function(n) { ... }` produces a FunctionDeclaration
    // node with `id: null` — the recursion-tracking push/pop guards
    // (`if (node.id)`) both take their false branch, so no name is ever
    // pushed onto currentFunctionStack and any calls inside are never
    // attributed to "the enclosing function" for recursion purposes.
    ruleTester.run('valid - anonymous default-exported function is not tracked for recursion', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            export default function(n) {
              if (n > 0) {
                helper(n - 1);
              }
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - estimateIterations non-BinaryExpression / non-comparison test shapes', () => {
    // estimateIterations only recognizes a `test` that is a BinaryExpression
    // using a comparison operator (<, <=, >, >=) with a numeric literal
    // right-hand side; every other `for` test shape falls through to
    // `null` (no largeLoopBound report), but neither branch was previously
    // exercised independently.
    ruleTester.run('valid - for-loop test is not a BinaryExpression', noUncheckedLoopCondition, {
      valid: [
        {
          code: 'for (let i = 0; iterator.hasNext(); i++) { advance(iterator); }',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - for-loop test uses a non-comparison binary operator', noUncheckedLoopCondition, {
      valid: [
        {
          code: 'for (let i = 0; i !== 10; i++) { console.log(i); }',
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - @safe annotation short-circuits every report site', () => {
    // Each `safetyChecker.isSafe(node, context)` early-return sits right
    // before a `context.report(...)` call; a `/** @safe */` JSDoc comment on
    // the enclosing statement makes isSafe() return true, which RuleTester
    // can exercise for real (see the same pattern used successfully in
    // no-unlimited-resource-allocation). One fixture per guarded report site.
    ruleTester.run('valid - @safe annotation on unsafeRecursion', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            function recursiveFunc(n) {
              if (n > 0) {
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
                recursiveFunc(n - 1);
              }
            }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on WhileStatement userControlledLoopBound', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            while (userInput-- > 0) { doWork(); }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on WhileStatement complex-DoS userControlledLoopBound', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            while (cache.match(rx)) { cache = cache.replace(rx, ''); }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on WhileStatement state-dependent infiniteLoop', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            while (isRunning) { doWork(); }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on ForStatement for(;;) infiniteLoop', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            for (;;) { doWork(); if (done) break; }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on ForStatement missing-test missingLoopTermination', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            for (let i = 0; ; i++) { if (i > 10) break; }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on ForStatement userControlledLoopBound', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            for (let i = 0; i < userInput; i++) { doWork(); }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on ForStatement complex-DoS userControlledLoopBound', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            for (let i = startIndex; i < endIndex; i++) { doWork(); }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on ForStatement largeLoopBound', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            for (let i = 0; i < 100000; i++) { processItem(); }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on DoWhileStatement userControlledLoopBound', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            do { doWork(); } while (userInput-- > 0);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on ForInStatement uncheckedLoopCondition', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            for (const key in req.body.data) { process(key); }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @safe annotation on ForOfStatement uncheckedLoopCondition', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            /** @safe */
            for (const item of req.body.data) { process(item); }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('involvesUserInput recursive expression walker', () => {
    // involvesUserInput() first tries a cheap textual substring scan over
    // the whole condition; a tainted *local* variable (assigned from user
    // input but whose own name doesn't textually contain any
    // userInputVariables substring) defeats that scan and forces the
    // recursive checkExpression() walker to run, which is what actually
    // exercises the CallExpression/BinaryExpression/UpdateExpression/
    // UnaryExpression branches below.
    ruleTester.run('invalid - tainted local reached via CallExpression argument + UpdateExpression', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: `
            let n = req.body.count;
            while (check(n++)) { doWork(); }
          `,
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
      ],
    });

    ruleTester.run('invalid - tainted local reached via CallExpression argument + UnaryExpression', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: `
            let n = req.body.count;
            while (check(-n)) { doWork(); }
          `,
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
      ],
    });

    ruleTester.run('invalid - tainted local reached via BinaryExpression both sides', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: `
            let n = req.body.count;
            while (check(n + offset)) { doWork(); }
          `,
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
      ],
    });

    ruleTester.run('valid - CallExpression with a spread argument does not crash the walker', noUncheckedLoopCondition, {
      valid: [
        {
          code: `
            let n = req.body.count;
            const rest = [1, 2, 3];
            while (check(...rest)) { doWork(); }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Layer 2 — node.loc?.start.line ?? 0 fallback (every report site)', () => {
    // Every context.report() call in this rule stringifies
    // `node.loc?.start.line ?? 0`. Real parsed nodes always carry `loc`, so
    // the `?? 0` fallback can never fire through RuleTester — it only
    // matters for synthetic/generated nodes. One mock-context call per
    // report site, each using a synthetic node with no `loc` property.

    it('unsafeRecursion (CallExpression) falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition);
      const functionDeclaration = listeners.FunctionDeclaration as (node: unknown) => void;
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      // Register the enclosing function so currentFunctionStack has an entry.
      functionDeclaration({ type: 'FunctionDeclaration', id: { type: 'Identifier', name: 'recur' } });

      // maxRecursionDepth defaults to a value >0; calling with callCount
      // reaching 1 and `currentFunction === 'recursiveFunc'` is not needed —
      // `callCount >= 1` alone triggers the report on the very first call
      // when combined with the name-based dangerous-pattern check, so use
      // the literal name 'recursiveFunc' to satisfy the flagged-pattern OR.
      functionDeclaration({ type: 'FunctionDeclaration', id: { type: 'Identifier', name: 'recursiveFunc' } });
      callExpression({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'recursiveFunc' },
        arguments: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('WhileStatement infiniteLoop (while(true)) falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition);
      const whileStatement = listeners.WhileStatement as (node: unknown) => void;

      whileStatement({
        type: 'WhileStatement',
        test: { type: 'Literal', value: true },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('infiniteLoop');
      expect(reports[0].data?.line).toBe('0');
    });

    it('WhileStatement userControlledLoopBound falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'userInput > 0',
      });
      const whileStatement = listeners.WhileStatement as (node: unknown) => void;

      whileStatement({
        type: 'WhileStatement',
        test: { type: 'BinaryExpression', operator: '>', left: { type: 'Identifier', name: 'userInput' }, right: { type: 'Literal', value: 0 } },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('userControlledLoopBound');
      expect(reports[0].data?.line).toBe('0');
    });

    it('WhileStatement complex-DoS userControlledLoopBound falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'cache.match(rx)',
      });
      const whileStatement = listeners.WhileStatement as (node: unknown) => void;

      whileStatement({
        type: 'WhileStatement',
        test: {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'cache' },
            property: { type: 'Identifier', name: 'match' },
          },
          arguments: [{ type: 'Identifier', name: 'rx' }],
        },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('userControlledLoopBound');
      expect(reports[0].data?.line).toBe('0');
    });

    it('WhileStatement state-dependent infiniteLoop falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'isRunning',
      });
      const whileStatement = listeners.WhileStatement as (node: unknown) => void;

      whileStatement({
        type: 'WhileStatement',
        test: { type: 'Identifier', name: 'isRunning' },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('infiniteLoop');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ForStatement for(;;) infiniteLoop falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition);
      const forStatement = listeners.ForStatement as (node: unknown) => void;

      forStatement({
        type: 'ForStatement',
        init: null,
        test: null,
        update: null,
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('infiniteLoop');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ForStatement missingLoopTermination falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition);
      const forStatement = listeners.ForStatement as (node: unknown) => void;

      forStatement({
        type: 'ForStatement',
        init: { type: 'VariableDeclaration' },
        test: null,
        update: { type: 'UpdateExpression' },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingLoopTermination');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ForStatement userControlledLoopBound falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'userInput > 0',
      });
      const forStatement = listeners.ForStatement as (node: unknown) => void;

      forStatement({
        type: 'ForStatement',
        init: null,
        test: { type: 'BinaryExpression', operator: '>', left: { type: 'Identifier', name: 'userInput' }, right: { type: 'Literal', value: 0 } },
        update: { type: 'UpdateExpression' },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('userControlledLoopBound');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ForStatement complex-DoS userControlledLoopBound falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'cache.match(rx)',
      });
      const forStatement = listeners.ForStatement as (node: unknown) => void;

      forStatement({
        type: 'ForStatement',
        init: null,
        test: {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'cache' },
            property: { type: 'Identifier', name: 'match' },
          },
          arguments: [{ type: 'Identifier', name: 'rx' }],
        },
        update: { type: 'UpdateExpression' },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('userControlledLoopBound');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ForStatement largeLoopBound falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'i < 1000000',
      });
      const forStatement = listeners.ForStatement as (node: unknown) => void;

      forStatement({
        type: 'ForStatement',
        init: null,
        test: {
          type: 'BinaryExpression',
          operator: '<',
          left: { type: 'Identifier', name: 'i' },
          right: { type: 'Literal', value: 1000000 },
        },
        update: { type: 'UpdateExpression' },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('largeLoopBound');
      expect(reports[0].data?.line).toBe('0');
    });

    it('DoWhileStatement userControlledLoopBound falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'userInput > 0',
      });
      const doWhileStatement = listeners.DoWhileStatement as (node: unknown) => void;

      doWhileStatement({
        type: 'DoWhileStatement',
        test: { type: 'BinaryExpression', operator: '>', left: { type: 'Identifier', name: 'userInput' }, right: { type: 'Literal', value: 0 } },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('userControlledLoopBound');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ForInStatement uncheckedLoopCondition falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'req.body.data',
      });
      const forInStatement = listeners.ForInStatement as (node: unknown) => void;

      forInStatement({
        type: 'ForInStatement',
        left: { type: 'Identifier', name: 'key' },
        right: { type: 'MemberExpression' },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('uncheckedLoopCondition');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ForOfStatement uncheckedLoopCondition falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'req.body.data',
      });
      const forOfStatement = listeners.ForOfStatement as (node: unknown) => void;

      forOfStatement({
        type: 'ForOfStatement',
        parent: undefined,
        left: { type: 'Identifier', name: 'item' },
        right: { type: 'MemberExpression' },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('uncheckedLoopCondition');
      expect(reports[0].data?.line).toBe('0');
    });
  });
});
