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

  describe('delegation patterns', () => {
    ruleTester.run('pure delegation is anemic', dddAnemicDomainModel, {
      valid: [
        // Method using built-in array methods (business logic, not delegation)
        {
          code: `
            class Order {
              constructor(items) { this.items = items; }
              calculateTotal() {
                return this.items.reduce((sum, i) => sum + i.price, 0);
              }
            }
          `,
        },
        // Class with actual business logic mixed with delegation
        {
          code: `
            class OrderProcessor {
              constructor(repo) { this.repository = repo; this.items = []; }
              calculateTotal() {
                return this.items.reduce((sum, i) => sum + i.price, 0);
              }
              save() {
                return this.repository.save(this);
              }
            }
          `,
        },
      ],
      invalid: [
        // Only delegation to this.repository.method() — anemic
        {
          code: `
            class Order {
              constructor(repo) { this.repository = repo; }
              save() {
                return this.repository.save(this);
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
        // Only delegation to this.service.method() — anemic
        {
          code: `
            class User {
              constructor(svc) { this.service = svc; }
              save() {
                return this.service.save(this);
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
        // Void delegation to this.repository.method() — anemic
        {
          code: `
            class User {
              constructor(repo) { this.repository = repo; }
              save() {
                this.repository.save(this);
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
        // Delegation to external service (Identifier.method) — anemic
        {
          code: `
            class Order {
              constructor() {}
              save() {
                return externalService.save(this);
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
        // Class with only property definitions (no methods)
        {
          code: `
            class Config {
              name = '';
              value = 0;
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
        // Class with only getters (get keyword)
        {
          code: `
            class Product {
              constructor(name) { this._name = name; }
              get name() { return this._name; }
              set name(v) { this._name = v; }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
      ],
    });
  });

  describe('class expressions', () => {
    ruleTester.run('class expressions', dddAnemicDomainModel, {
      valid: [
        // Anonymous class expression — ignored (no name to report)
        {
          code: `
            const x = class {
              constructor() {}
            };
          `,
        },
        // Named class expression with business logic
        {
          code: `
            const OrderModel = class Order {
              constructor(items) { this.items = items; }
              calculateTotal() {
                return this.items.reduce((sum, i) => sum + i.price, 0);
              }
            };
          `,
        },
      ],
      invalid: [
        // Named class expression without business logic
        {
          code: `
            const OrderModel = class Order {
              constructor() { this.value = null; }
            };
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
      ],
    });
  });

  describe('delegation to api/client/dao patterns', () => {
    ruleTester.run('delegation service patterns', dddAnemicDomainModel, {
      valid: [],
      invalid: [
        // Delegation to this.api.method()
        {
          code: `
            class User {
              constructor(api) { this.api = api; }
              fetch() {
                return this.api.fetch(this.id);
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
        // Delegation to this.client.method()
        {
          code: `
            class User {
              constructor(c) { this.client = c; }
              fetch() {
                return this.client.get(this.id);
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
        // Delegation to this.dao.method()
        {
          code: `
            class User {
              constructor(d) { this.dao = d; }
              fetch() {
                return this.dao.findById(this.id);
              }
            }
          `,
          errors: [{ messageId: 'anemicDomainModel' }],
        },
      ],
    });
  });

  describe('minBusinessMethods option', () => {
    ruleTester.run('custom minBusinessMethods', dddAnemicDomainModel, {
      valid: [
        // Class with 2 business methods passes when min is 2
        {
          code: `
            class Order {
              constructor() {}
              calculateTotal() { return 42; }
              applyDiscount() { return 40; }
            }
          `,
          options: [{ minBusinessMethods: 2 }],
        },
      ],
      invalid: [
        // Class with 1 business method fails when min is 2
        {
          code: `
            class Order {
              constructor() {}
              calculateTotal() { return 42; }
            }
          `,
          options: [{ minBusinessMethods: 2 }],
          errors: [{ messageId: 'anemicDomainModel' }],
        },
      ],
    });
  });

  describe('DTO pattern matching', () => {
    ruleTester.run('custom dto patterns', dddAnemicDomainModel, {
      valid: [
        // Payload class ignored by default
        {
          code: `
            class EventPayload {
              constructor(data) { this.data = data; }
            }
          `,
        },
        // Data suffix ignored by default
        {
          code: `
            class UserData {
              constructor(name) { this.name = name; }
            }
          `,
        },
      ],
      invalid: [],
    });
  });
});
