/**
 * Comprehensive tests for enforce-naming rule
 * Domain: Enforce domain-specific naming conventions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { enforceNaming } from '../rules/domain/enforce-naming';

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

describe('enforce-naming', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - correct domain terminology', enforceNaming, {
      valid: [
        // Correct terminology
        {
          code: 'const customerId = 123;',
          options: [{ 
            terms: [{ 
              incorrect: 'user',
              correct: 'customer',
              context: 'ecommerce'
            }] 
          }],
        },
        {
          code: 'function getCustomer() { }',
          options: [{ 
            terms: [{ 
              incorrect: 'getUser',
              correct: 'getCustomer',
              context: 'ecommerce'
            }] 
          }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Wrong Terminology', () => {
    ruleTester.run('invalid - incorrect domain terminology', enforceNaming, {
      valid: [],
      invalid: [
        // Note: Rule has a message placeholder bug ('context' not substituted)
        // This is a rule implementation issue that needs to be fixed
        // Tests represent expected behavior once bug is fixed
        {
          code: 'const userId = 123;',
          options: [{ 
            terms: [{ 
              incorrect: 'user',
              correct: 'customer',
              context: 'ecommerce'
            }] 
          }],
          errors: [
            {
              messageId: 'wrongTerminology',
              suggestions: [
                {
                  messageId: 'useDomainTerm',
                  output: 'const customerId = 123;',
                },
              ],
            },
          ],
        },
        {
          code: 'function getUser() { }',
          options: [{ 
            terms: [{ 
              incorrect: /getUser/,
              correct: 'getCustomer',
              context: 'ecommerce'
            }] 
          }],
          errors: [
            {
              messageId: 'wrongTerminology',
              suggestions: [
                {
                  messageId: 'useDomainTerm',
                  output: 'function getCustomer() { }',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', enforceNaming, {
      valid: [],
      invalid: [
        {
          code: 'const userId = 123;',
          options: [{ 
            terms: [{ 
              incorrect: 'user',
              correct: 'customer',
              context: 'ecommerce'
            }] 
          }],
          errors: [
            {
              messageId: 'wrongTerminology',
              suggestions: [
                {
                  messageId: 'useDomainTerm',
                  output: 'const customerId = 123;',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases - empty terms', enforceNaming, {
      valid: [
        // Rule should return early if no terms configured
        {
          code: 'const userId = 123;',
          options: [{ terms: [] }],
        },
        {
          code: 'const userId = 123;',
          options: [{}],
        },
        {
          code: 'const userId = 123;',
          // No options provided
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - class declarations', enforceNaming, {
      valid: [
        {
          code: 'class CustomerService { }',
          options: [{ 
            terms: [{ 
              incorrect: 'user',
              correct: 'customer',
              context: 'ecommerce'
            }] 
          }],
        },
      ],
      invalid: [
        {
          code: 'class UserService { }',
          options: [{ 
            terms: [{ 
              incorrect: 'user',
              correct: 'customer',
              context: 'ecommerce'
            }] 
          }],
          errors: [
            {
              messageId: 'wrongTerminology',
              suggestions: [
                {
                  messageId: 'useDomainTerm',
                  output: 'class customerService { }',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - property definitions', enforceNaming, {
      valid: [
        {
          code: 'class MyClass { customerId: number; }',
          options: [{ 
            terms: [{ 
              incorrect: 'user',
              correct: 'customer',
              context: 'ecommerce'
            }] 
          }],
        },
      ],
      invalid: [
        {
          code: 'class MyClass { userId: number; }',
          options: [{ 
            terms: [{ 
              incorrect: 'user',
              correct: 'customer',
              context: 'ecommerce'
            }] 
          }],
          errors: [
            {
              messageId: 'wrongTerminology',
              suggestions: [
                {
                  messageId: 'useDomainTerm',
                  output: 'class MyClass { customerId: number; }',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - method definitions', enforceNaming, {
      valid: [
        {
          code: 'class MyClass { getCustomer() { } }',
          options: [{ 
            terms: [{ 
              incorrect: 'getUser',
              correct: 'getCustomer',
              context: 'ecommerce'
            }] 
          }],
        },
      ],
      invalid: [
        {
          code: 'class MyClass { getUser() { } }',
          options: [{ 
            terms: [{ 
              incorrect: 'getUser',
              correct: 'getCustomer',
              context: 'ecommerce'
            }] 
          }],
          errors: [
            {
              messageId: 'wrongTerminology',
              suggestions: [
                {
                  messageId: 'useDomainTerm',
                  output: 'class MyClass { getCustomer() { } }',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - class without id', enforceNaming, {
      valid: [
        {
          code: 'export default class { }',
          options: [{ 
            terms: [{ 
              incorrect: 'user',
              correct: 'customer',
              context: 'ecommerce'
            }] 
          }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - property without identifier key', enforceNaming, {
      valid: [
        {
          code: 'class MyClass { ["user-id"]: number; }',
          options: [{ 
            terms: [{ 
              incorrect: 'user',
              correct: 'customer',
              context: 'ecommerce'
            }] 
          }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - method without identifier key', enforceNaming, {
      valid: [
        {
          code: 'class MyClass { ["get-user"]() { } }',
          options: [{ 
            terms: [{ 
              incorrect: 'getUser',
              correct: 'getCustomer',
              context: 'ecommerce'
            }] 
          }],
        },
      ],
      invalid: [],
    });
  });
});

