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
  // The rule is scoped to a DOMAIN layer, so every fixture below has to live in
  // one or it is testing the path guard rather than the logic. The scoping
  // itself is exercised deliberately in the block at the end of this file.
  defaultFilenames: { ts: 'src/domain/order.ts', tsx: 'src/domain/order.tsx' },
});

describe('ddd-anemic-domain-model', () => {
  describe('valid domain models', () => {
    ruleTester.run('allow rich domain models', dddAnemicDomainModel, {
      valid: [
        // Class with business logic
        {
          name: 'a class that computes something is not anemic',
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
          name: 'getters and setters over fields, and no behaviour of its own',
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

  describe('classifier edge cases (coverage: getter/setter + delegation classifiers)', () => {
    ruleTester.run('edge-case member shapes', dddAnemicDomainModel, {
      valid: [
        // TS method overload signatures: value is TSEmptyBodyFunctionExpression,
        // so both classifiers bail out and the signature is not counted; the
        // two-statement implementation counts as a business method.
        {
          code: `
            class Order {
              place(id: string): void;
              place(id: number): void;
              place(id: string | number): void {
                this.validate(id);
                this.commit(id);
              }
            }
          `,
        },
        // String-literal method key: methodName resolves to '' in classifiers
        {
          code: `
            class Order {
              'total'() { return this.a + this.b; }
            }
          `,
        },
        // Empty method body: isSimpleGetterSetter returns false, counts as business
        {
          code: `
            class Order {
              getTotal() {}
            }
          `,
        },
        // get-prefixed method whose single statement is a bare return (no argument)
        {
          code: `
            class Order {
              getStatus() { return; }
            }
          `,
        },
        // set-prefixed method whose single statement is a call, not an assignment;
        // also exercises the void-call-with-Identifier-callee path in isPureDelegation
        {
          code: `
            class Order {
              setStatus(s) { validate(s); }
            }
          `,
        },
        // Computed this-property in return delegation: propName '' -> business logic
        {
          code: `
            class Order {
              save() { return this['repository'].save(this); }
            }
          `,
        },
        // Delegation-shaped return where the object is \`this\` directly
        {
          code: `
            class Order {
              refresh() { return this.compute(); }
            }
          `,
        },
        // Void call with computed callee property: methodName '' -> not delegation
        {
          code: `
            class Order {
              touch() { this.helper['run'](1); }
            }
          `,
        },
        // Void call on computed this-property: propName '' -> not delegation
        {
          code: `
            class Order {
              flush() { this['repository'].save(this); }
            }
          `,
        },
        // Void call on built-in collection method is business logic
        {
          code: `
            class Order {
              addItem(i) { this.items.push(i); }
            }
          `,
        },
        // Void call on a plain identifier object is not this.<service> delegation
        {
          code: `
            class Order {
              run() { service.exec(); }
            }
          `,
        },
        // Computed method key in countBusinessMethods: methodName '' still counts
        {
          code: `
            class Order {
              ['compute']() {
                const t = this.x;
                return t;
              }
            }
          `,
        },
        // Static block member is neither MethodDefinition nor PropertyDefinition
        {
          code: `
            class Order {
              static { }
              compute() { return this.x + 1; }
            }
          `,
        },
        // Capitalized service-pattern property names in return delegation:
        // userRepository / authService / httpApi hit the capitalized includes()
        // operands, so all three methods are delegation... which makes the class
        // anemic — pair them with one business method to keep it valid.
        {
          code: `
            class Order {
              persist() { return this.userRepository.save(this); }
              authorize() { return this.authService.check(this); }
              send() { return this.httpApi.post(this); }
              computeTotal() { return this.a + this.b; }
            }
          `,
        },
      ],
      invalid: [
        // Computed property name on the delegated call: methodName '' is not a
        // built-in, this.repository matches the service pattern -> delegation,
        // so the class has zero business methods.
        {
          code: `
            class Order {
              save() { return this.repository['save'](this); }
            }
          `,
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

/**
 * An anemic domain model is a defect of a DOMAIN LAYER.
 *
 * Outside one, a class with fields and no methods is a transport object, an
 * options bag or an error shape — which is exactly what a client library
 * ships. Measured on okta-auth-js: 38 findings, every one under `idx/`,
 * `myaccount/`, `errors/`, `exports/`, `base/`, `authn/`, `core/` or `http/`,
 * and not a domain layer among them. 526 across the pinned corpus.
 */
describe('ddd-anemic-domain-model — domain scope', () => {
  const anemic = `
    export class Order {
      id: string;
      total: number;
      constructor(id: string, total: number) { this.id = id; this.total = total; }
    }
  `;

  ruleTester.run('valid - outside a domain layer', dddAnemicDomainModel, {
    valid: [
      { code: anemic, filename: 'src/http/response.ts' },
      { code: anemic, filename: 'src/errors/AuthError.ts' },
      { code: anemic, filename: 'lib/idx/remediation.ts' },
      // `domain` as a FILENAME is not a domain directory.
      { code: anemic, filename: 'src/api/domain.ts' },
    ],
    invalid: [
      {
        // FN GUARD: inside a domain layer it still reports.
        code: anemic,
        filename: 'src/domain/order.ts',
        errors: 1,
      },
      {
        // FN GUARD: nested anywhere under the segment.
        code: anemic,
        filename: 'packages/billing/src/entities/invoice.ts',
        errors: 1,
      },
      {
        // FN GUARD: an empty list restores the pre-scoping behaviour.
        code: anemic,
        filename: 'src/http/response.ts',
        options: [{ domainPaths: [] }],
        errors: 1,
      },
    ],
  });
});
