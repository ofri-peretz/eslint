/**
 * Tests for export rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { exportRule } from '../rules/export';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('export', exportRule, {
  valid: [
    // Single named exports
    { code: `export const foo = 1;` },
    { code: `export function bar() {}` },
    { code: `export class Baz {}` },

    // Multiple distinct exports
    {
      code: `
        export const a = 1;
        export const b = 2;
        export const c = 3;
      `,
    },

    // Single default export
    { code: `export default function() {}` },
    { code: `export default class {}` },
    { code: `export default 42;` },

    // Export specifiers with different names
    {
      code: `
        const foo = 1;
        const bar = 2;
        export { foo, bar };
      `,
    },

    // Re-export all
    { code: `export * from './module';` },

    // Named re-export
    { code: `export * as utils from './utils';` },

    // TypeScript exports
    { code: `export type Foo = string;` },
    { code: `export interface Bar { x: number; }` },
    { code: `export enum Status { Active, Inactive }` },
  ],

  invalid: [
    // Duplicate named exports
    {
      code: `
        export const foo = 1;
        export const foo = 2;
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // Duplicate via export specifier
    {
      code: `
        export const foo = 1;
        const bar = 2;
        export { bar as foo };
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // Multiple default exports
    {
      code: `
        export default 1;
        export default 2;
      `,
      errors: [{ messageId: 'duplicateDefault' }],
    },

    // Default via specifier
    {
      code: `
        export default 1;
        const foo = 2;
        export { foo as default };
      `,
      errors: [{ messageId: 'duplicateDefault' }],
    },

    // Duplicate function exports
    {
      code: `
        export function foo() {}
        export function foo() {}
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // Duplicate class exports
    {
      code: `
        export class Foo {}
        export class Foo {}
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // Duplicate namespace re-export
    {
      code: `
        export * as utils from './utils';
        export * as utils from './other-utils';
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // FN GUARD: two type aliases DO collide — only the type/value split is
    // legal, not everything that touches type space.
    {
      code: `
        export type Foo = A;
        export type Foo = B;
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // FN GUARD: `type X` beside `interface X` is an error, even though two
    // interfaces would have merged. Both orders.
    {
      code: `
        export interface Foo { a: string }
        export type Foo = B;
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },
    {
      code: `
        export type Foo = B;
        export interface Foo { a: string }
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // FN GUARD: an enum occupies BOTH spaces, so it collides with a value…
    {
      code: `
        export const Foo = 1;
        export enum Foo { A }
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // …and with a type.
    {
      code: `
        export type Foo = A;
        export enum Foo { A }
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },

    // An enum occupies both spaces, so enum-vs-enum conflicts in both — but it
    // is ONE declaration and must produce exactly ONE report. Raised by
    // CodeRabbit on #593; routing the enum through two checkAndAddExport calls
    // reported the same node twice, and the enum-vs-value and enum-vs-type
    // cases above could not catch it because only one space conflicts there.
    {
      code: `
        export enum Foo { A }
        export enum Foo { B }
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },
    {
      // Same one-report rule when the earlier declaration is an interface.
      code: `
        export interface Foo { a: string }
        export enum Foo { A }
      `,
      errors: [{ messageId: 'duplicateExport' }],
    },
  ],
});

/**
 * TypeScript's two declaration spaces.
 *
 * A name may occupy the type space and the value space at once, and the rule
 * keyed a single map by name alone. On the pinned corpus that produced 758
 * findings in twilio-node — every one this shape, in a generated SDK where the
 * pattern is the point.
 */
ruleTester.run('export — declaration spaces', exportRule, {
  valid: [
    {
      // The exact shape from twilio-node src/index.ts:30-31.
      code: `
        export type Twilio = ITwilio;
        export const Twilio = ITwilio;
      `,
    },
    {
      // Order must not matter.
      code: `
        export const AccessToken = IAccessToken;
        export type AccessToken = IAccessToken;
      `,
    },
    {
      // Interface + value is the same split.
      code: `
        export interface Options { a: string }
        export const Options = {};
      `,
    },
    {
      // `interface X` twice is declaration MERGING, and legal.
      code: `
        export interface Foo { a: string }
        export interface Foo { b: number }
      `,
    },
    {
      // `export type { X }` is type-space, so it does not collide with a value.
      code: `
        const Foo = 1;
        export { Foo };
        export type { Foo } from './types';
      `,
    },
    {
      // Inline `type` specifier, same reasoning.
      code: `
        const Foo = 1;
        export { Foo };
        export { type Foo } from './types';
      `,
    },
  ],
  invalid: [],
});

/**
 * A namespace member is not a module export.
 *
 * `export type T` inside `export namespace A` exports `A.T`. The rule keyed its
 * maps on the bare name, so Stripe's `.d.ts` files reported
 * `PaymentIntent.SetupFutureUsage` and
 * `PaymentIntentConfirmParams.SetupFutureUsage` as the same export — two
 * distinct types that happen to share a member name, which is what a namespace
 * is for. All 3 findings this rule produced on the pinned corpus were that.
 *
 * The key is PREFIXED rather than the declaration skipped, so a genuine
 * duplicate inside one namespace still reports.
 */
describe('export — namespace scope is part of the identity', () => {
  ruleTester.run('namespace scoping', exportRule, {
    valid: [
      {
        // The Stripe shape.
        code: "export namespace A { export type T = 'a'; }\nexport namespace B { export type T = 'b'; }",
      },
      {
        // A top-level export and a namespace member of the same name are `T`
        // and `A.T`.
        code: "export type T = 'top';\nexport namespace A { export type T = 'nested'; }",
      },
      {
        // Nested namespaces, so the walk has to climb more than one level.
        code: "export namespace A { export namespace B { export type T = 'ab'; } }\nexport namespace C { export type T = 'c'; }",
      },
      {
        // A dotted namespace name reaches the TSQualifiedName branch.
        code: "export namespace A.B { export type T = 'ab'; }\nexport namespace C { export type T = 'c'; }",
      },
      {
        // `declare module 'x'` reaches the StringLiteral branch.
        code: "declare module 'x' { export type T = 'x'; }\ndeclare module 'y' { export type T = 'y'; }",
      },
    ],
    invalid: [
      {
        // POSITIVE CONTROL: a real duplicate at module scope. Without it the
        // valid cases pass on a rule that stopped reporting.
        code: "export type T = 'a';\nexport type T = 'b';",
        errors: [{ messageId: 'duplicateExport' }],
      },
      {
        // FN GUARD: a duplicate INSIDE one namespace is still a duplicate. This
        // is why the fix prefixes the key instead of skipping the declaration.
        code: "export namespace A {\n  export type T = 'a';\n  export type T = 'b';\n}",
        errors: [{ messageId: 'duplicateExport' }],
      },
      {
        // FN GUARD: same nested namespace, twice.
        code: "export namespace A { export namespace B {\n  export type T = 'a';\n  export type T = 'b';\n} }",
        errors: [{ messageId: 'duplicateExport' }],
      },
    ],
  });
});
