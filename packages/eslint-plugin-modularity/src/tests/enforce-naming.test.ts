/**
 * Tests for enforce-naming rule
 * Enforce domain-specific naming conventions with business context
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { enforceNaming } from '../rules/enforce-naming';

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

describe('enforce-naming', () => {
  describe('no terms configured', () => {
    ruleTester.run('no errors when no terms', enforceNaming, {
      valid: [
        // Without terms configured, everything passes
        { code: 'const user = {};' },
        { code: 'const customer = {};' },
        { code: 'function processOrder() {}' },
      ],
      invalid: [],
    });
  });

  describe('domain terminology enforcement', () => {
    const ecommerceTerms = [
      {
        incorrect: 'user',
        correct: 'customer',
        context: 'ecommerce domain - customers are the primary entity',
      },
      {
        incorrect: 'item',
        correct: 'product',
        context: 'ecommerce domain - products are what we sell',
      },
    ];

    ruleTester.run('enforce ecommerce terms', enforceNaming, {
      valid: [
        // Correct terminology
        {
          code: 'const customer = {};',
          options: [{ domain: 'ecommerce', terms: ecommerceTerms }],
        },
        {
          code: 'const product = {};',
          options: [{ domain: 'ecommerce', terms: ecommerceTerms }],
        },
        {
          code: 'function processCustomerOrder() {}',
          options: [{ domain: 'ecommerce', terms: ecommerceTerms }],
        },
      ],
      invalid: [
        // Wrong terminology - user instead of customer (lowercase preserved)
        {
          code: 'const user = {};',
          options: [{ domain: 'ecommerce', terms: ecommerceTerms }],
          errors: [{ 
            messageId: 'wrongTerminology',
            suggestions: [{ messageId: 'useDomainTerm', output: 'const customer = {};' }],
          }],
        },
        // Wrong terminology - item instead of product (lowercase preserved)
        {
          code: 'const item = {};',
          options: [{ domain: 'ecommerce', terms: ecommerceTerms }],
          errors: [{ 
            messageId: 'wrongTerminology',
            suggestions: [{ messageId: 'useDomainTerm', output: 'const product = {};' }],
          }],
        },
        // Function with wrong term (case preserved: User -> Customer)
        {
          code: 'function processUserData() {}',
          options: [{ domain: 'ecommerce', terms: ecommerceTerms }],
          errors: [{ 
            messageId: 'wrongTerminology',
            suggestions: [{ messageId: 'useDomainTerm', output: 'function processCustomerData() {}' }],
          }],
        },
        // Class with wrong term (case preserved: User -> Customer)
        {
          code: 'class UserService {}',
          options: [{ domain: 'ecommerce', terms: ecommerceTerms }],
          errors: [{ 
            messageId: 'wrongTerminology',
            suggestions: [{ messageId: 'useDomainTerm', output: 'class CustomerService {}' }],
          }],
        },
      ],
    });
  });

  describe('healthcare domain', () => {
    const healthcareTerms = [
      {
        incorrect: 'user',
        correct: 'patient',
        context: 'healthcare domain - patients are the primary entity',
      },
    ];

    ruleTester.run('enforce healthcare terms', enforceNaming, {
      valid: [
        {
          code: 'const patient = {};',
          options: [{ domain: 'healthcare', terms: healthcareTerms }],
        },
      ],
      invalid: [
        {
          code: 'const user = {};',
          options: [{ domain: 'healthcare', terms: healthcareTerms }],
          errors: [{ 
            messageId: 'wrongTerminology',
            suggestions: [{ messageId: 'useDomainTerm', output: 'const patient = {};' }],
          }],
        },
      ],
    });
  });
});
