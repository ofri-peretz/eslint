/**
 * Comprehensive tests for nested-complexity-hotspots rule
 * Complexity: Identifies nested control structures that harm readability
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { nestedComplexityHotspots } from '../rules/complexity/nested-complexity-hotspots';

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
          code: `
            if (condition) {
              doSomething();
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

