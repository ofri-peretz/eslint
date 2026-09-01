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
          name: 'a counted loop',
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
          name: 'a loop with no exit condition',
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
          code: 'const userInput = req.query.count; while (userInput-- > 0) { doWork(); }',
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
          code: 'const userInput = req.query.count; while (-userInput > 0) { /* UnaryExpression */ process(); }',
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
        {
          code: 'const userInput = req.query.count; while (userInput++ < 100) { /* UpdateExpression */ process(); }',
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
        {
          code: 'const userInput = req.query.count; while (!userInput) { /* UnaryExpression ! */ process(); }',
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
        {
          code: 'const userInput = req.query.count; while (check(userInput)) { /* CallExpression with user input */ process(); }',
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
          code: 'const userInput = req.query.count; for (const key in userInput) { console.log(key); }',
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
    // THESE THREE CASES USED TO BE ASSERTED AS INVALID, and their own titles
    // conceded there was no user input in any of them: "(non-user-input
    // names)", "pagination pattern", "arithmetic-overflow pattern". The verdict
    // came from `sourceCode.getText(condition)` containing `.match(`, or `page`
    // next to `pageSize`, or `*` next to `limit` - and the messageId reported
    // was `userControlledLoopBound`, a CWE-606 claim that a CLIENT chose the
    // bound. Nothing here is client-controlled.
    //
    // The heuristics that produced them are gone; see the REMOVED note in
    // index.ts for the string-literal and comment probes that settled it.
    ruleTester.run('valid - no user input means no user-controlled bound', noUncheckedLoopCondition, {
      valid: [
        "while (cache.match(rx)) { cache = cache.replace(rx, ''); }",
        'while (page < pageSize) { advance(); }',
        'while (offset * limit < total) { advance(); }',
      ],
      invalid: [],
    });

    // do-while's userControlledLoopBound report path was only ever exercised
    // by a `/** @safe */`-annotated fixture (which short-circuits before
    // context.report), so the actual report call itself was never hit.
    ruleTester.run('invalid - DoWhileStatement user-controlled condition', noUncheckedLoopCondition, {
      valid: [],
      invalid: [
        {
          code: 'const userInput = req.query.count; do { doWork(); } while (userInput-- > 0);',
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

  describe('A flag is not evidence of an infinite loop', () => {
    // THIS DESCRIBE USED TO BE `Invalid Code - WhileStatement state-dependent
    // variable-name branches`, and it asserted all three of these as invalid.
    // Its own comment named the mechanism: "a 4-way `||` over `.includes(...)`
    // substring tests ('continue'/'running'/'active'/'enabled')". The verdict
    // was the SPELLING of the condition variable - `while (isActive)` reported
    // and `while (isReady)` did not, on identical control flow - and it fired
    // whether or not the body contained a `break`.
    //
    // A supervisor loop driven by a flag the body clears is the most common
    // loop in any codebase, and the flag is the reason it terminates.
    ruleTester.run('valid - loops driven by a state flag', noUncheckedLoopCondition, {
      valid: [
        'while (shouldContinue) { doWork(); }',
        'while (isActive) { doWork(); }',
        'while (isEnabled) { doWork(); }',
        'while (isRunning) { doWork(); }',
        'let isActive = true; while (isActive) { isActive = step(); }',
      ],
      invalid: [],
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
            const userInput = req.query.count;
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
            const userInput = req.query.count;
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
            const userInput = req.query.count;
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

      // THIS TEST USED TO PASS THE LITERAL NAME 'recursiveFunc', with a comment
      // saying so, "to satisfy the flagged-pattern OR". That OR was two
      // hardcoded function names lifted out of this file's own fixtures. The
      // evidence is now structural: a self-call with no branch above it inside
      // the function, whatever the function is called.
      const fn: Record<string, unknown> = {
        type: 'FunctionDeclaration',
        id: { type: 'Identifier', name: 'drain' },
      };
      const block: Record<string, unknown> = { type: 'BlockStatement', parent: fn };
      const statement: Record<string, unknown> = { type: 'ExpressionStatement', parent: block };
      block.body = [statement];
      fn.body = block;
      const call: Record<string, unknown> = {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'drain' },
        arguments: [],
        parent: statement,
      };
      statement.expression = call;

      functionDeclaration(fn);
      callExpression(call);

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('unsafeRecursion');
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
        sourceText: 'req',
      });
      const whileStatement = listeners.WhileStatement as (node: unknown) => void;

      whileStatement({
        type: 'WhileStatement',
        test: { type: 'BinaryExpression', operator: '>', left: { type: 'MemberExpression', object: { type: 'Identifier', name: 'req' }, property: { type: 'Identifier', name: 'count' } }, right: { type: 'Literal', value: 0 } },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('userControlledLoopBound');
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
        sourceText: 'req',
      });
      const forStatement = listeners.ForStatement as (node: unknown) => void;

      forStatement({
        type: 'ForStatement',
        init: null,
        test: { type: 'BinaryExpression', operator: '>', left: { type: 'MemberExpression', object: { type: 'Identifier', name: 'req' }, property: { type: 'Identifier', name: 'count' } }, right: { type: 'Literal', value: 0 } },
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
        sourceText: 'req',
      });
      const doWhileStatement = listeners.DoWhileStatement as (node: unknown) => void;

      doWhileStatement({
        type: 'DoWhileStatement',
        test: { type: 'BinaryExpression', operator: '>', left: { type: 'MemberExpression', object: { type: 'Identifier', name: 'req' }, property: { type: 'Identifier', name: 'count' } }, right: { type: 'Literal', value: 0 } },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('userControlledLoopBound');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ForInStatement uncheckedLoopCondition falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'req',
      });
      const forInStatement = listeners.ForInStatement as (node: unknown) => void;

      forInStatement({
        type: 'ForInStatement',
        left: { type: 'Identifier', name: 'key' },
        right: { type: 'MemberExpression', object: { type: 'Identifier', name: 'req' }, property: { type: 'Identifier', name: 'body' } },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('uncheckedLoopCondition');
      expect(reports[0].data?.line).toBe('0');
    });

    it('ForOfStatement uncheckedLoopCondition falls back to line 0', () => {
      const { listeners, reports } = createWithMockContext(noUncheckedLoopCondition, {
        sourceText: 'req',
      });
      const forOfStatement = listeners.ForOfStatement as (node: unknown) => void;

      forOfStatement({
        type: 'ForOfStatement',
        parent: undefined,
        left: { type: 'Identifier', name: 'item' },
        right: { type: 'MemberExpression', object: { type: 'Identifier', name: 'req' }, property: { type: 'Identifier', name: 'body' } },
        body: { type: 'BlockStatement', body: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('uncheckedLoopCondition');
      expect(reports[0].data?.line).toBe('0');
    });
  });
});

/**
 * Corpus regressions: a name is not evidence.
 *
 * This rule produced 28 findings across express + ultimate-backend +
 * ack-nestjs-boilerplate, and one of the 16 ILB-CWE-Corpus false positives.
 * Every one traced to taint inferred from identifier *names* — a substring
 * test against ['req','request','body','query','params','input','data'] run
 * over both bare identifiers and the printed text of whole expressions.
 *
 * It also propagated. `const found = coll.find(query)` made `found` tainted
 * because the initializer's text contained "query", so every later
 * `for (const r of found)` was a finding.
 *
 * Taint now starts only at a real request object and spreads by assignment.
 */
describe('corpus regressions — names are not taint', () => {
  ruleTester.run('name-based taint', noUncheckedLoopCondition, {
    valid: [
      // ILB-CWE-Corpus CWE-116/replace-until-stable.js. The loop provably
      // terminates — the string shrinks on every pass. Its only offence was
      // a parameter named `input`, which tainted `current` through
      // `String(input)` and made the exit condition "user-controlled".
      {
        code: `
          function stripTags(input) {
            let current = String(input);
            let previous;
            do {
              previous = current;
              current = current.replace(/<[^>]*>/g, '');
            } while (current !== previous);
            return current;
          }
        `,
      },
      // ultimate-backend/arango-parser.utils.ts:37 — a locally-built AQL
      // query object, not a request.
      { code: `for (let prop in query) { build(prop); }` },
      // Names that merely contain a default substring.
      { code: `for (const [k, v] of metadataMap) { use(v); }` },
      { code: `for (const row of dataSource.rows) { use(row); }` },
      { code: `for (const h of LoggerRequestIdHeaders) { use(h); }` },
      { code: `for (const e of orderByExtractFromRequest) { use(e); }` },
      // The propagation case: `found` is only "tainted" because the
      // initializer's printed text mentioned `query`.
      {
        code: `
          const found = collection.find(query);
          for (const result of found) { use(result); }
        `,
      },
    ],
    invalid: [
      // Real request-derived data still reports, directly…
      {
        code: `for (const key in req.body) { use(key); }`,
        errors: [{ messageId: 'uncheckedLoopCondition' }],
      },
      {
        code: `for (const item of request.query.items) { use(item); }`,
        errors: [{ messageId: 'uncheckedLoopCondition' }],
      },
      // …and through assignment, which is what taint tracking is for.
      // ultimate-backend/headers.datasource.ts:16 is this shape and remains
      // a true positive.
      {
        code: `
          const ctxHeaders = ctx.headers;
          for (const key in ctxHeaders) { use(key); }
        `,
        errors: [{ messageId: 'uncheckedLoopCondition' }],
      },
      {
        code: `
          const limit = req.query.limit;
          while (limit-- > 0) { doWork(); }
        `,
        errors: [{ messageId: 'userControlledLoopBound' }],
      },
    ],
  });
});

/**
 * Schema options that nothing else in this file sets.
 *
 * `maxRecursionDepth`, `trustedSanitizers`, `trustedAnnotations` and
 * `strictMode` all shipped with their branches never executed by a test. Each
 * one below is covered by a PAIR over the SAME source text — one entry that
 * sets the option, one that does not — whose verdicts disagree. A test that
 * sets an option and gets the default answer executes the line and proves
 * nothing: the branch could be deleted and this suite would stay green.
 */
describe('no-unchecked-loop-condition — option differentials', () => {
  // Two self-call sites, under a name that is neither of the two the recursion
  // check hard-codes (`recursiveFunc`, `traverseObject`). That leaves
  // `callCount > maxRecursionDepth` as the only thing that can decide the
  // verdict, so the source sits either side of the threshold: the default 10 is
  // never reached, a limit of 1 is crossed by the second call site.
  //
  // Worth knowing while reading this pair: `callCount` is the number of
  // *lexical* self-call sites the visitor has walked past, not a runtime
  // recursion depth. The option therefore behaves as "how many recursive call
  // sites may a function contain", which is not what its schema description
  // ("Recursion depth above which a call is reported") says. These cases pin
  // that the option is load-bearing, not that the measure is the right one.
  const TWO_SITE_RECURSION = `
    function walk(node) {
      if (node.left) walk(node.left);
      if (node.right) walk(node.right);
    }
  `;

  ruleTester.run('option maxRecursionDepth', noUncheckedLoopCondition, {
    valid: [
      // Default maxRecursionDepth is 10 and two self-calls never reach it.
      { code: TWO_SITE_RECURSION },
    ],
    invalid: [
      // Identical source, limit lowered to 1: the second self-call crosses it.
      // Delete `maxRecursionDepth` from the rule and this case goes quiet.
      {
        code: TWO_SITE_RECURSION,
        options: [{ maxRecursionDepth: 1 }],
        errors: [{ messageId: 'unsafeRecursion' }],
      },
    ],
  });

  ruleTester.run('option trustedSanitizers', noUncheckedLoopCondition, {
    valid: [
      // The recursion report site hands the CALL node to safetyChecker.isSafe,
      // and a call whose callee is a trusted name reads as sanitized — so
      // registering `walk` as a loop protector suppresses it. Membership is
      // exact, which is why the default (empty list) cannot match it.
      // `maxRecursionDepth: 1` is only there to make the source report at all;
      // the sole difference from the invalid twin is the trustedSanitizers entry.
      {
        code: TWO_SITE_RECURSION,
        options: [{ maxRecursionDepth: 1, trustedSanitizers: ['walk'] }],
      },
    ],
    invalid: [
      {
        code: TWO_SITE_RECURSION,
        options: [{ maxRecursionDepth: 1 }],
        errors: [{ messageId: 'unsafeRecursion' }],
      },
    ],
  });

  ruleTester.run('option strictMode', noUncheckedLoopCondition, {
    valid: [
      {
        code: TWO_SITE_RECURSION,
        options: [{ maxRecursionDepth: 1, trustedSanitizers: ['walk'] }],
      },
    ],
    invalid: [
      // strictMode makes safetyChecker.isSafe return false unconditionally, so
      // the trustedSanitizers entry that silenced the valid twin above stops
      // being honoured. This is the clean differential for strictMode: the
      // report site here is guarded ONLY by isSafe, so nothing else can account
      // for the change.
      {
        code: TWO_SITE_RECURSION,
        options: [
          { maxRecursionDepth: 1, trustedSanitizers: ['walk'], strictMode: true },
        ],
        errors: [{ messageId: 'unsafeRecursion' }],
      },
    ],
  });

  // A request-driven loop bound, carrying a comment that none of the built-in
  // SAFE_ANNOTATIONS is a substring of — `@appsec-reviewed` contains neither
  // `@safe`, `@validated`, `@verified` nor any sibling, so the default list
  // cannot silence it and only the custom entry can.
  const ANNOTATED_USER_BOUND = `
    function drain(req) {
      // @appsec-reviewed
      while (req.query.more) {
        poll();
      }
    }
  `;

  ruleTester.run('option trustedAnnotations', noUncheckedLoopCondition, {
    valid: [
      {
        code: ANNOTATED_USER_BOUND,
        options: [{ trustedAnnotations: ['@appsec-reviewed'] }],
      },
    ],
    invalid: [
      // Same source with the default (empty) annotation list: the comment is
      // just a comment and the user-controlled bound reports.
      {
        code: ANNOTATED_USER_BOUND,
        errors: [{ messageId: 'userControlledLoopBound' }],
      },
    ],
  });
});

// -------------------------------------------------------------------------
// Regression locks. Every case below FAILS on the rule as it stood before the
// corpus at benchmarks/rule-corpus/secure-coding__no-unchecked-loop-condition
// was written. That corpus scored 56.0% F1 on its first run: 6 false positives
// and 5 misses on 25 fixtures.
// -------------------------------------------------------------------------
describe('Regression - the ledger textual-matching probe', () => {
  // docs/rule-ledger/secure-coding__no-unchecked-loop-condition.md flagged this
  // rule for `textual-matching` and gave the probe: put the matched text in a
  // string literal or a comment inside otherwise-clean code. Both halves
  // reported. Each pair below is the probe with its positive control - the
  // second member of every pair was ALWAYS quiet, which is what makes the first
  // member evidence about the text rather than about the loop.
  ruleTester.run('valid - matched text in a string literal or a comment', noUncheckedLoopCondition, {
    valid: [
      // `.match(` as data, in a hand-written lexer.
      `while (source.slice(c, c + 7) !== '.match(') { c += 1; }`,
      `while (source.slice(c, c + 7) !== '.test(') { c += 1; }`,
      // `endIndex` in a comment inside the loop test.
      'for (let i = 0; i < /* stop before endIndex */ rows.length; i++) { work(i); }',
      // A local index window; `startIndex`/`endIndex` are the spellings, and
      // both ends are derived from `rows.length`.
      'const startIndex = 0; const endIndex = 5; for (let i = startIndex; i < endIndex; i++) { work(i); }',
      // `page` next to `pageSize`, with the bound derived from a server count.
      'let page = 0; while (page < totalPages && pageSize > 0) { page += 1; }',
      // `*` next to `limit`, with both operands local constants.
      'const limit = 50; const width = 100; for (let i = 0; i < limit * width; i++) { slots.push(null); }',
    ],
    invalid: [],
  });
});

describe('Regression - a flag is not evidence of an infinite loop', () => {
  ruleTester.run('valid - state-flag loops', noUncheckedLoopCondition, {
    valid: [
      'let isActive = true; while (isActive) { isActive = step(); }',
      'while (shouldContinue) { doWork(); }',
      'while (isRunning) { doWork(); }',
      'while (isEnabled) { doWork(); }',
    ],
    invalid: [
      // The shapes that ARE evidence still report.
      { code: 'while (true) { doWork(); }', errors: [{ messageId: 'infiniteLoop' }] },
      { code: 'for (;;) { doWork(); }', errors: [{ messageId: 'infiniteLoop' }] },
    ],
  });
});

describe('Regression - taint roots the walk could not follow', () => {
  ruleTester.run('invalid - shapes that were silent', noUncheckedLoopCondition, {
    valid: [],
    invalid: [
      {
        // A TypeScript cast. Express types `req.query.x` as
        // `string | string[] | ParsedQs | undefined`, so a TS codebase cannot
        // use it as a bound without one - which meant the rule did not fire on
        // TypeScript Express code at all.
        name: 'as-number cast',
        code: 'for (let i = 0; i < (req.query.count as unknown as number); i++) { work(i); }',
        errors: [{ messageId: 'userControlledLoopBound' }],
      },
      {
        // A parse is not a clamp. `?limit=99999999` parses cleanly.
        name: 'parsed but not clamped',
        code: [
          'const limit = parseInt(req.query.limit, 10);',
          'for (let i = 0; i < limit; i++) { rows.push(i); }',
        ].join('\n'),
        errors: [{ messageId: 'userControlledLoopBound' }],
      },
      {
        // A `||` default replaces the falsy case and bounds nothing.
        name: 'logical-or default',
        code: [
          'const pageSize = parseInt(req.query.pageSize) || 10;',
          'for (let i = 0; i < pageSize; i++) { rows.push(i); }',
        ].join('\n'),
        errors: [{ messageId: 'userControlledLoopBound' }],
      },
    ],
  });

  ruleTester.run('valid - bounds that really are bounded', noUncheckedLoopCondition, {
    valid: [
      // `Math.min`/`Math.max` are the only two that impose a ceiling, and they
      // are matched on the `Math` global rather than found in the text.
      [
        'const requested = Number.parseInt(req.query.pages, 10) || 1;',
        'const pages = Math.min(Math.max(requested, 1), 100);',
        'for (let i = 0; i < pages; i++) { rows.push(i); }',
      ].join('\n'),
      // `.length` is a MEASUREMENT of data already materialised, not a count
      // the client can inflate. `Object.keys(req.body).length` is the number of
      // fields the body parser already built.
      [
        'const fields = Object.keys(req.body);',
        'for (let i = 0; i < fields.length; i++) { applied.push(fields[i]); }',
      ].join('\n'),
      'const n = req.body.items && req.body.items.length; while (check(n)) { doWork(); }',
    ],
    invalid: [
      {
        // …but a property that is not a measurement still reports.
        name: 'a chosen count, not a measured one',
        code: 'for (let i = 0; i < req.body.count; i++) { work(i); }',
        errors: [{ messageId: 'userControlledLoopBound' }],
      },
    ],
  });
});

describe('Regression - a guard clause validates a collection', () => {
  ruleTester.run('valid - size-checked collections', noUncheckedLoopCondition, {
    valid: [
      // The guard-clause form, which is what everybody writes. It is a
      // preceding SIBLING of the loop, not an ancestor, so an ancestor-only
      // walk reported the fix.
      [
        'const items = req.body.items;',
        'if (!Array.isArray(items) || items.length > 500) { return; }',
        'for (const item of items) { save(item); }',
      ].join('\n'),
      // The nested form still works.
      'if (Array.isArray(req.body.items) && req.body.items.length < 100) { for (const item of req.body.items) { save(item); } }',
    ],
    invalid: [
      {
        // A guard on a DIFFERENT binding is not a guard on this one. The old
        // check compared printed text with `String.includes`, so `items`
        // matched inside `filteredItems`.
        name: 'a guard on a different binding',
        code: [
          'const items = req.body.items;',
          'const filteredItems = [];',
          'if (!Array.isArray(filteredItems) || filteredItems.length > 500) { return; }',
          'for (const item of items) { save(item); }',
        ].join('\n'),
        errors: [{ messageId: 'uncheckedLoopCondition' }],
      },
    ],
  });
});

describe('Regression - recursion is decided by structure, not by two names', () => {
  // `currentFunction === 'recursiveFunc'` and `currentFunction ===
  // 'traverseObject'` used to be the ONLY things that could report
  // `unsafeRecursion` in practice: the other disjunct counts recursive call
  // SITES against maxRecursionDepth, so it needs eleven self-calls written
  // inside one function. Both names are fixtures from this file.
  ruleTester.run('valid - recursion the rule cannot decide, and recursion it can clear', noUncheckedLoopCondition, {
    valid: [
      // Renaming the two magic names must not change the verdict. Both of
      // these are conditional recursion, which is not decidable here.
      'function traverseObject(n) { for (const c of n.kids) { traverseObject(c); } }',
      'function walk(n) { for (const c of n.kids) { walk(c); } }',
      // A depth-bounded recursion is the correct remediation and must not be
      // reported. The base case is a preceding sibling of the recursive call.
      'function factorial(n, depth = 0) { if (depth > 10) return 1; return n * factorial(n - 1, depth + 1); }',
      'function safeRecursion(n, depth = 0) { if (depth > 10) return; if (n > 0) safeRecursion(n - 1, depth + 1); }',
    ],
    invalid: [
      {
        // Nothing branches above the self-call, so the function never returns -
        // whatever it is called.
        name: 'unconditional self-recursion, innocuously named',
        code: 'function drain(queue) { handle(queue.pop()); drain(queue); }',
        errors: [{ messageId: 'unsafeRecursion' }],
      },
    ],
  });

  /**
   * Locks for the three remaining decision arms, each written as a real
   * program rather than a synthetic AST.
   */
  describe('coverage - remaining decision arms', () => {
    ruleTester.run('block base case, ternary clamp, mismatched guard', noUncheckedLoopCondition, {
      valid: [
        // The base case is a BLOCK, not a bare statement. The exit search has
        // to walk the block's statement ARRAY to find the `return`; with a
        // braceless base case it never touches that arm. Both spellings are
        // the same program and must agree.
        'function walk(n) { if (n <= 0) { return 0; } return walk(n - 1); }',
        // A clamp reached through a ternary. Both branches clamp, so the bound
        // is bounded whichever way the flag falls - which is exactly why the
        // arm requires BOTH branches rather than either.
        [
          'export function paginate(req, fast) {',
          '  const limit = fast ? Math.min(req.query.n, 10) : Math.min(req.query.n, 5);',
          '  const rows = [];',
          '  for (let i = 0; i < limit; i++) { rows.push(i); }',
          '  return rows;',
          '}',
        ].join('\n'),
      ],
      invalid: [
        // A validation call whose argument is a LITERAL, not the collection
        // being iterated. Comparing a Literal against an Identifier is the
        // path-comparison mismatch arm: the guard proves nothing about
        // `req.body.items`, so the loop is still unchecked.
        {
          name: 'guard argument does not match the iterated collection',
          code: [
            'export function importAll(req) {',
            '  if (Array.isArray(42)) {',
            '    for (const record of req.body.items) { persist(record); }',
            '  }',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'uncheckedLoopCondition' }],
        },
        // There IS a branch above the self-call, but it cannot terminate
        // anything: no `return` and no `throw` anywhere inside it. A branch
        // that only logs is not a base case, so the recursion is still
        // unbounded. This is the arm that distinguishes "a guard exists" from
        // "a guard exits".
        {
          name: 'preceding branch contains no exit at all',
          code: 'function countdown(n) { if (n > 5) { console.log(n); } countdown(n - 1); }',
          errors: [{ messageId: 'unsafeRecursion' }],
        },
        // `||` in the condition, where `&&` is handled separately. For `&&`
        // only the right operand can bound the loop (`items && items.length`),
        // but for `||` EITHER side can supply an attacker-chosen bound, so
        // both have to be examined - here the tainted value is on the left.
        {
          name: 'either side of a logical OR can carry the bound',
          code: [
            'export function replay(req, fallback) {',
            '  let cursor = 0;',
            '  while (cursor < (req.query.events || fallback)) { cursor++; }',
            '  return cursor;',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
        // The mirror of the case above. With the tainted operand on the LEFT
        // the check short-circuits and never evaluates the right; only a clean
        // left operand forces the right-hand branch to be taken.
        {
          name: 'logical OR with the tainted operand on the right',
          code: [
            'export function replay(req, fallback) {',
            '  let cursor = 0;',
            '  while (cursor < (fallback || req.query.events)) { cursor++; }',
            '  return cursor;',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'userControlledLoopBound' }],
        },
      ],
    });
  });
});
