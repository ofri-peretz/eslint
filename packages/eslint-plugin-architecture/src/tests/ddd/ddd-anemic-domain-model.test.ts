/**
 * Comprehensive tests for ddd-anemic-domain-model rule
 * DDD: Detects entities with only getters/setters and no business logic
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { dddAnemicDomainModel } from '../../rules/ddd/ddd-anemic-domain-model';

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

describe('ddd-anemic-domain-model', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - rich domain models', dddAnemicDomainModel, {
      valid: [
        {
          code: `
            class User {
              private name: string;
              
              getName(): string {
                return this.name;
              }
              
              changeName(newName: string): void {
                this.validateName(newName);
                this.name = newName;
              }
              
              private validateName(name: string): void {
                if (!name) throw new Error('Invalid name');
              }
            }
          `,
        },
        {
          code: `
            class UserDTO {
              name: string;
            }
          `,
          options: [{ ignoreDtos: true }],
        },
        {
          code: `
            class UserRequest {
              name: string;
            }
          `,
          options: [{ ignoreDtos: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Anemic Domain Models', () => {
    ruleTester.run('invalid - anemic models', dddAnemicDomainModel, {
      valid: [],
      invalid: [
        {
          code: `
            class User {
              private name: string;
              
              getName(): string {
                return this.name;
              }
              
              setName(name: string): void {
                this.name = name;
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
        {
          code: `
            class Product {
              private price: number;
              
              get price(): number {
                return this.price;
              }
              
              set price(value: number) {
                this.price = value;
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - min business methods', dddAnemicDomainModel, {
      valid: [
        {
          code: `
            class User {
              getName(): string { return ''; }
              setName(name: string): void {}
            }
          `,
          options: [{ minBusinessMethods: 0 }],
        },
      ],
      invalid: [
        {
          code: `
            class User {
              getName(): string { return ''; }
              setName(name: string): void {}
            }
          `,
          options: [{ minBusinessMethods: 2 }],
          errors: [{ messageId: 'anemicDomainModel' }],
        },
      ],
    });
  });
});

