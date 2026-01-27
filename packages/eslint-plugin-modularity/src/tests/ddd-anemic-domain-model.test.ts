/**
 * Tests for ddd-anemic-domain-model rule
 * Detects entities with only getters/setters and no business logic
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { dddAnemicDomainModel } from '../rules/ddd-anemic-domain-model';

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
  describe('valid domain models', () => {
    ruleTester.run('allow rich domain models', dddAnemicDomainModel, {
      valid: [
        // Class with business logic
        {
          code: `
            class Order {
              constructor(items) {
                this.items = items;
              }
              calculateTotal() {
                return this.items.reduce((sum, item) => sum + item.price, 0);
              }
            }
          `,
        },
        // Class with multiple business methods
        {
          code: `
            class User {
              constructor(name, email) {
                this.name = name;
                this.email = email;
              }
              changeEmail(newEmail) {
                if (this.validateEmail(newEmail)) {
                  this.email = newEmail;
                }
              }
              validateEmail(email) {
                return email.includes('@');
              }
            }
          `,
        },
        // DTO is allowed (ignored by default)
        {
          code: `
            class UserDTO {
              constructor(data) {
                this.name = data.name;
                this.email = data.email;
              }
            }
          `,
        },
        // Request object (ignored)
        {
          code: `
            class CreateUserRequest {
              constructor(data) {
                this.name = data.name;
              }
            }
          `,
        },
        // Response object (ignored)
        {
          code: `
            class UserResponse {
              constructor(data) {
                this.id = data.id;
              }
            }
          `,
        },
      ],
      invalid: [
        // Anemic class with only getters/setters
        {
          code: `
            class Person {
              constructor(name) {
                this.name = name;
              }
              getName() {
                return this.name;
              }
              setName(name) {
                this.name = name;
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
        // Class with no methods at all
        {
          code: `
            class EmptyEntity {
              constructor() {
                this.value = null;
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
      ],
    });
  });

  describe('DTO options', () => {
    ruleTester.run('respect ignoreDtos option', dddAnemicDomainModel, {
      valid: [],
      invalid: [
        // When ignoreDtos is false, DTOs are flagged
        {
          code: `
            class UserDTO {
              constructor(data) {
                this.name = data.name;
              }
            }
          `,
          options: [{ ignoreDtos: false }],
          errors: [{ messageId: 'anemicDomainModel' }],
        },
      ],
    });
  });
});
