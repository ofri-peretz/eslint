/**
 * Comprehensive tests for ddd-value-object-immutability rule
 * DDD: Validates value objects are properly immutable
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { dddValueObjectImmutability } from '../rules/ddd/ddd-value-object-immutability';

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

describe('ddd-value-object-immutability', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - immutable value objects', dddValueObjectImmutability, {
      valid: [
        {
          code: `
            class MoneyValue {
              private readonly amount: number;
              private readonly currency: string;
              
              constructor(amount: number, currency: string) {
                this.amount = amount;
                this.currency = currency;
                Object.freeze(this);
              }
            }
          `,
        },
        {
          code: `
            class EmailValue {
              readonly value: string;
              
              constructor(value: string) {
                this.value = value;
              }
            }
          `,
        },
        {
          code: `
            class RegularClass {
              name: string;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Mutable Value Objects', () => {
    ruleTester.run('invalid - mutable value objects', dddValueObjectImmutability, {
      valid: [],
      invalid: [
        {
          code: `
            class MoneyValue {
              amount: number;
              currency: string;
            }
          `,
          errors: [{ messageId: 'mutableValueObject' }],
        },
        {
          code: `
            class EmailValue {
              value: string;
              
              constructor(value: string) {
                this.value = value;
              }
            }
          `,
          errors: [{ messageId: 'mutableValueObject' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - custom value object patterns', dddValueObjectImmutability, {
      valid: [
        {
          code: `
            class MyValue {
              value: string;
            }
          `,
          options: [{ valueObjectPatterns: ['ValueObject'] }],
        },
      ],
      invalid: [
        {
          code: `
            class MyValueObject {
              value: string;
            }
          `,
          options: [{ valueObjectPatterns: ['ValueObject'] }],
          errors: [{ messageId: 'mutableValueObject' }],
        },
      ],
    });
  });
});

