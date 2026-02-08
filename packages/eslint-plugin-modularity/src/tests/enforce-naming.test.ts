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

  describe('case preservation', () => {
    const terms = [
      {
        incorrect: 'user',
        correct: 'customer',
        context: 'ecommerce domain',
      },
    ];

    ruleTester.run('preserve UPPER_CASE', enforceNaming, {
      valid: [],
      invalid: [
        // UPPER_CASE identifier should produce UPPER_CASE replacement
        {
          code: 'const USER = {};',
          options: [{ domain: 'ecommerce', terms }],
          errors: [{
            messageId: 'wrongTerminology',
            suggestions: [{ messageId: 'useDomainTerm', output: 'const CUSTOMER = {};' }],
          }],
        },
      ],
    });
  });

  describe('regex terms', () => {
    const regexTerms = [
      {
        incorrect: /^dat[ae]$/i,
        correct: 'record',
        context: 'use record instead of data/date',
      },
    ];

    ruleTester.run('regex incorrect terms', enforceNaming, {
      valid: [
        {
          code: 'const record = {};',
          options: [{ domain: 'general', terms: regexTerms }],
        },
        // Does not match regex
        {
          code: 'const database = {};',
          options: [{ domain: 'general', terms: regexTerms }],
        },
      ],
      invalid: [
        {
          code: 'const data = {};',
          options: [{ domain: 'general', terms: regexTerms }],
          errors: [{
            messageId: 'wrongTerminology',
            suggestions: [{ messageId: 'useDomainTerm', output: 'const record = {};' }],
          }],
        },
      ],
    });
  });

  describe('property and method definitions', () => {
    const terms = [
      {
        incorrect: 'user',
        correct: 'customer',
        context: 'domain terminology',
      },
    ];

    ruleTester.run('property and method violations', enforceNaming, {
      valid: [
        // Property with correct term
        {
          code: `
            class OrderService {
              customerName = '';
            }
          `,
          options: [{ domain: 'ecommerce', terms }],
        },
        // Method with correct term
        {
          code: `
            class OrderService {
              getCustomer() { return null; }
            }
          `,
          options: [{ domain: 'ecommerce', terms }],
        },
      ],
      invalid: [
        // PropertyDefinition with incorrect term
        {
          code: `
            class OrderService {
              userName = '';
            }
          `,
          options: [{ domain: 'ecommerce', terms }],
          errors: [{
            messageId: 'wrongTerminology',
            suggestions: [{ messageId: 'useDomainTerm', output: `
            class OrderService {
              customerName = '';
            }
          ` }],
          }],
        },
        // MethodDefinition with incorrect term
        {
          code: `
            class OrderService {
              getUser() { return null; }
            }
          `,
          options: [{ domain: 'ecommerce', terms }],
          errors: [{
            messageId: 'wrongTerminology',
            suggestions: [{ messageId: 'useDomainTerm', output: `
            class OrderService {
              getCustomer() { return null; }
            }
          ` }],
          }],
        },
      ],
    });
  });
});
