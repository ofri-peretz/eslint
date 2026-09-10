/**
 * Comprehensive tests for nested-complexity-hotspots rule
 * Complexity: Identifies nested control structures that harm readability
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { nestedComplexityHotspots } from '../../rules/maintainability/nested-complexity-hotspots';

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

describe('nested-complexity-hotspots', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - shallow nesting', nestedComplexityHotspots, {
      valid: [
        {
          name: 'a single if',
          code: `
            if (condition) {
              doSomething();
            }
          `,
        },
        {
          /*
           * A flat `if / else if` chain is one level of nesting, not one per
           * link. ESTree models `else if` as an IfStatement in `alternate`, so
           * walking parents counted each link as another level: the last branch
           * of this chain reported "Nesting depth 6 exceeds maximum 4" while
           * sitting at indentation level 2.
           *
           * The rule's own fix text is "Use early returns, guard clauses, or
           * extract methods" — it was flagging the shape that advice produces.
           * ESLint core's `max-depth` excludes `else if` for the same reason,
           * and the sibling rule cognitive-complexity already carries the
           * comment "else if doesn't increase nesting".
           *
           * burgee packages/burgee/src/yargs-parser.ts:362
           */
          name: 'a flat else-if chain is not nesting',
          code: `
            for (const arg of args) {
              if (arg === '-a') take('a');
              else if (arg === '-b') take('b');
              else if (arg === '-c') take('c');
              else if (arg === '-d') take('d');
              else if (arg === '--') break;
              else take('x');
            }
          `,
        },
        {
          name: 'a top-level guard chain of returns is not nesting',
          code: `
            function classify(x) {
              if (x < 0) return 'neg';
              else if (x === 0) return 'zero';
              else if (x < 10) return 'small';
              else if (x < 100) return 'medium';
              else if (x < 1000) return 'large';
              else return 'huge';
            }
          `,
        },
        {
          code: `
            if (a) {
              if (b) {
                if (c) {
                  doSomething();
                }
              }
            }
          `,
          options: [{ maxDepth: 4 }],
        },
        {
          code: `
            for (const item of items) {
              process(item);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Excessive Nesting', () => {
    ruleTester.run('invalid - too much nesting', nestedComplexityHotspots, {
      valid: [],
      invalid: [
        {
          name: 'five ifs nested inside one another',
          code: `
            if (a) {
              if (b) {
                if (c) {
                  if (d) {
                    if (e) {
                      doSomething();
                    }
                  }
                }
              }
            }
          `,
          errors: [{ messageId: 'nestedComplexity' }],
        },
        {
          code: `
            for (const a of items) {
              for (const b of a.items) {
                for (const c of b.items) {
                  for (const d of c.items) {
                    for (const e of d.items) {
                      process(e);
                    }
                  }
                }
              }
            }
          `,
          errors: [{ messageId: 'nestedComplexity' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - custom max depth', nestedComplexityHotspots, {
      valid: [
        {
          code: `
            if (a) {
              if (b) {
                doSomething();
              }
            }
          `,
          options: [{ maxDepth: 2 }],
        },
      ],
      invalid: [
        {
          code: `
            if (a) {
              if (b) {
                if (c) {
                  doSomething();
                }
              }
            }
          `,
          options: [{ maxDepth: 2 }],
          errors: [{ messageId: 'nestedComplexity' }],
        },
      ],
    });
  });
});
