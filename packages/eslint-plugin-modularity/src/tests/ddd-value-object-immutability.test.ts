/**
 * Tests for ddd-value-object-immutability rule
 * Validates value objects are properly immutable
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { dddValueObjectImmutability } from '../rules/ddd-value-object-immutability';

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
  describe('valid immutable value objects', () => {
    ruleTester.run('allow immutable value objects', dddValueObjectImmutability, {
      valid: [
        // Value object with readonly properties
        {
          code: `
            class MoneyValue {
              readonly amount: number;
              readonly currency: string;
              constructor(amount: number, currency: string) {
                this.amount = amount;
                this.currency = currency;
              }
            }
          `,
        },
        // Value object using Object.freeze
        {
          code: `
            class AddressValue {
              street: string;
              city: string;
              constructor(street: string, city: string) {
                this.street = street;
                this.city = city;
                Object.freeze(this);
              }
            }
          `,
        },
        // Non-value object classes are allowed to be mutable
        {
          code: `
            class UserService {
              items: string[];
              addItem(item: string) {
                this.items.push(item);
              }
            }
          `,
        },
      ],
      invalid: [
        // Mutable value object without readonly
        {
          code: `
            class EmailValue {
              address: string;
              constructor(address: string) {
                this.address = address;
              }
            }
          `,
          errors: [{ messageId: 'mutableValueObject' }],
        },
        // Value object with mutable properties
        {
          code: `
            class NameVO {
              firstName: string;
              lastName: string;
            }
          `,
          errors: [{ messageId: 'mutableValueObject' }],
        },
      ],
    });
  });

  describe('custom patterns', () => {
    ruleTester.run('respect custom patterns', dddValueObjectImmutability, {
      valid: [
        // Custom pattern not matched
        {
          code: `
            class Price {
              amount: number;
            }
          `,
          options: [{ valueObjectPatterns: ['VO', 'ValueObject'] }],
        },
      ],
      invalid: [
        // Custom pattern matched
        {
          code: `
            class PriceModel {
              amount: number;
            }
          `,
          options: [{ valueObjectPatterns: ['Model'] }],
          errors: [{ messageId: 'mutableValueObject' }],
        },
      ],
    });
  });
});
