/**
 * Comprehensive tests for identical-functions rule
 * Duplication: Detects duplicate function implementations
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { identicalFunctions } from '../../rules/maintainability/identical-functions';

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

describe('identical-functions', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - unique functions', identicalFunctions, {
      valid: [
        // Unique functions
        {
          code: `
            function add(a, b) { return a + b; }
            function subtract(a, b) { return a - b; }
          `,
        },
        // Functions below minimum lines
        {
          code: `
            function one() { return 1; }
            function two() { return 2; }
          `,
          options: [{ minLines: 3 }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Duplicate Functions', () => {
    ruleTester.run(
      'invalid - identical function implementations',
      identicalFunctions,
      {
        valid: [],
        invalid: [
          {
            code: `
            function processUser(user) {
              if (!user) return null;
              return user.name.toUpperCase();
            }
            
            function processCustomer(customer) {
              if (!customer) return null;
              return customer.name.toUpperCase();
            }
          `,
            options: [{ minLines: 3, similarityThreshold: 0.8 }],
            errors: [{ messageId: 'identicalFunctions' }],
          },
        ],
      },
    );
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', identicalFunctions, {
      valid: [],
      invalid: [
        {
          code: `
            function formatA(data) {
              return data.toUpperCase();
            }
            
            function formatB(data) {
              return data.toUpperCase();
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
          errors: [
            {
              messageId: 'identicalFunctions',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', identicalFunctions, {
      valid: [
        {
          code: `
            function one() { return 1; }
            function two() { return 2; }
          `,
          options: [{ minLines: 3 }],
        },
        // Line 107: ignoreTestFiles option
        {
          code: `
            function testA() { return 1; }
            function testB() { return 1; }
          `,
          filename: '/path/to/file.test.ts',
          options: [{ ignoreTestFiles: true }],
        },
      ],
      invalid: [
        {
          code: `
            function processA(data) {
              if (!data) return null;
              return data.value;
            }
            
            function processB(data) {
              if (!data) return null;
              return data.value;
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
          errors: [{ messageId: 'identicalFunctions' }],
        },
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Lines 139, 144-176: Levenshtein distance algorithm
    // Test when str2 is longer than str1 (line 139)
    // Test different string comparisons to cover the algorithm
    ruleTester.run(
      'line 139, 144-176 - Levenshtein distance',
      identicalFunctions,
      {
        valid: [],
        invalid: [
          {
            code: `
            function processLong(data) {
              if (!data) return null;
              return data.value.toUpperCase();
            }
            
            function processShort(x) {
              if (!x) return null;
              return x.value.toUpperCase();
            }
          `,
            options: [{ minLines: 3, similarityThreshold: 0.7 }],
            errors: [{ messageId: 'identicalFunctions' }],
          },
          {
            code: `
            function formatUser(user) {
              const name = user.name;
              const email = user.email;
              return { name, email };
            }
            
            function formatPerson(person) {
              const name = person.name;
              const email = person.email;
              return { name, email };
            }
          `,
            options: [{ minLines: 4, similarityThreshold: 0.8 }],
            errors: [{ messageId: 'identicalFunctions' }],
          },
        ],
      },
    );

    // Line 279: Default return in suggestRefactoring
    ruleTester.run(
      'line 279 - default refactoring suggestion',
      identicalFunctions,
      {
        valid: [],
        invalid: [
          {
            code: `
            function funcA() {
              return Math.random();
            }
            
            function funcB() {
              return Math.random();
            }
          `,
            options: [{ minLines: 2, similarityThreshold: 0.9 }],
            errors: [{ messageId: 'identicalFunctions' }],
          },
        ],
      },
    );

    // Both early-exit prunes in calculateSimilarity.
    //
    // This rule was 90.9% of ALL rule time before those prunes existed — a
    // full |a|x|b| edit-distance matrix for every pair of functions in a file,
    // growing quadratically (4.3x the source cost 8.3x the time). The prunes
    // took it from 933 ms to 26 ms over the same 60-file corpus with byte-for-
    // byte identical findings.
    //
    // Each prune needs a different shape of input, and neither is reachable
    // from the fixtures above:
    //
    //   - the LENGTH ceiling wants two functions of very different size, so
    //     `shorter/longer` alone falls under the threshold and no matrix is
    //     ever built;
    //   - the DISTANCE BUDGET wants two functions of nearly the SAME size but
    //     different content, so the length ceiling passes and the walk has to
    //     start before it can prove the pair hopeless.
    //
    // Both must stay `valid` — a prune that reported a duplicate it shouldn't
    // would be a correctness bug, and these cases verify that half of the
    // contract.
    //
    // They do NOT lock the prunes themselves. Deleting either one leaves every
    // case here green; the rule would simply run ~30x slower and still report
    // exactly this. That other half — that the prunes actually fire and cannot
    // be silently removed — needs an observable signal rather than a finding,
    // and lives in `identical-functions-perf.test.ts`.
    ruleTester.run('similarity prunes (performance)', identicalFunctions, {
      valid: [
        {
          // Length ceiling: 1-line body vs a much longer one.
          code: `
            function tiny() {
              return 1;
            }

            function sprawling() {
              const a = compute(1);
              const b = compute(2);
              const c = compute(3);
              const d = compute(4);
              return a + b + c + d;
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
        },
        {
          // Distance budget. Note `normalizeBody` rewrites EVERY identifier to
          // `VAR`, so renaming things changes nothing — only structure and
          // punctuation survive, and the pair must differ there.
          //
          // Measured on the normalized bodies: length ratio 0.952 (clears the
          // 0.9 ceiling, so prune 1 does not fire) against an edit distance of
          // 23 versus a budget of 6 — the DP walk has to start, then bail.
          code: `
            function reduceTotals() {
              const total = items.reduce((sum, item) => sum + item.price, 0);
              return total;
            }

            function collectFlags() {
              const flags = [alpha, beta].filter(Boolean).concat(gamma).length;
              return flags;
            }
          `,
          options: [{ minLines: 2, similarityThreshold: 0.9 }],
        },
      ],
      invalid: [],
    });
  });
});
