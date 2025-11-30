/**
 * Comprehensive tests for no-anonymous-default-export rule
 * Forbid anonymous values as default exports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAnonymousDefaultExport } from '../rules/architecture/no-anonymous-default-export';

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

describe('no-anonymous-default-export', () => {
  describe('Default behavior (no allowances)', () => {
    ruleTester.run('forbid anonymous exports by default', noAnonymousDefaultExport, {
      valid: [
        // Named function exports
        {
          code: 'export default function myFunction() {}',
        },
        // Named class exports
        {
          code: 'export default class MyClass {}',
        },
        // Named arrow function (assigned to variable)
        {
          code: 'const myArrow = () => {}; export default myArrow;',
        },
        // Identifier exports
        {
          code: 'const obj = {}; export default obj;',
        },
        // Literal exports
        {
          code: 'export default "string";',
        },
        {
          code: 'export default 42;',
        },
        {
          code: 'export default true;',
        },
        // Object expressions
        {
          code: 'export default { key: "value" };',
        },
        // Array expressions
        {
          code: 'export default [1, 2, 3];',
        },
        // Named exports (not default)
        {
          code: 'export function namedFunction() {}',
        },
        {
          code: 'export class NamedClass {}',
        },
      ],
      invalid: [
        // Anonymous arrow function
        {
          code: 'export default () => {};',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
            },
          ],
        },
        // Anonymous function expression
        {
          code: 'export default function() {};',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
            },
          ],
        },
        // Anonymous class expression
        {
          code: 'export default class {};',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
              data: {
                exportType: 'ClassExpression',
                suggestion: 'Add name to class: export default class ComponentName {}',
                benefit: 'Named exports improve debugging, tree-shaking, and code navigation',
              },
            },
          ],
        },
        // Anonymous arrow function with parameters
        {
          code: 'export default (param) => param * 2;',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
              data: {
                exportType: 'ArrowFunctionExpression',
              },
            },
          ],
        },
        // Anonymous function with complex body
        {
          code: 'export default function(a, b) { return a + b; };',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
              data: {
                exportType: 'FunctionExpression',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Allow arrow functions', () => {
    ruleTester.run('allow anonymous arrow functions', noAnonymousDefaultExport, {
      valid: [
        // Anonymous arrow functions allowed
        {
          code: 'export default () => {};',
          options: [{ allowArrowFunction: true }],
        },
        {
          code: 'export default (param) => param * 2;',
          options: [{ allowArrowFunction: true }],
        },
        {
          code: 'export default (a, b) => { return a + b; };',
          options: [{ allowArrowFunction: true }],
        },
        // Other anonymous exports still forbidden
        {
          code: 'export default function myFunc() {};',
          options: [{ allowArrowFunction: true }],
        },
      ],
      invalid: [
        // Function expressions still forbidden
        {
          code: 'export default function() {};',
          options: [{ allowArrowFunction: true }],
          errors: [
            {
              messageId: 'anonymousDefaultExport',
              data: {
                exportType: 'FunctionExpression',
              },
            },
          ],
        },
        // Class expressions still forbidden
        {
          code: 'export default class {};',
          options: [{ allowArrowFunction: true }],
          errors: [
            {
              messageId: 'anonymousDefaultExport',
              data: {
                exportType: 'ClassExpression',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Allow function expressions', () => {
    ruleTester.run('allow anonymous function expressions', noAnonymousDefaultExport, {
      valid: [
        // Anonymous function expressions allowed
        {
          code: 'export default function() {};',
          options: [{ allowFunctionExpression: true }],
        },
        {
          code: 'export default function(a, b) { return a + b; };',
          options: [{ allowFunctionExpression: true }],
        },
        // Other anonymous exports still forbidden
        {
          code: 'export default function myFunc() {};',
          options: [{ allowFunctionExpression: true }],
        },
      ],
      invalid: [
        // Arrow functions still forbidden
        {
          code: 'export default () => {};',
          options: [{ allowFunctionExpression: true }],
          errors: [
            {
              messageId: 'anonymousDefaultExport',
            },
          ],
        },
        // Class expressions still forbidden
        {
          code: 'export default class {};',
          options: [{ allowFunctionExpression: true }],
          errors: [
            {
              messageId: 'anonymousDefaultExport',
              data: {
                exportType: 'ClassExpression',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Allow class expressions', () => {
    ruleTester.run('allow anonymous class expressions', noAnonymousDefaultExport, {
      valid: [
        // Anonymous class expressions allowed
        {
          code: 'export default class {};',
          options: [{ allowClassExpression: true }],
        },
        {
          code: 'export default class { method() {} };',
          options: [{ allowClassExpression: true }],
        },
        // Other anonymous exports still forbidden
        {
          code: 'export default class MyClass {};',
          options: [{ allowClassExpression: true }],
        },
      ],
      invalid: [
        // Arrow functions still forbidden
        {
          code: 'export default () => {};',
          options: [{ allowClassExpression: true }],
          errors: [
            {
              messageId: 'anonymousDefaultExport',
            },
          ],
        },
        // Function expressions still forbidden
        {
          code: 'export default function() {};',
          options: [{ allowClassExpression: true }],
          errors: [
            {
              messageId: 'anonymousDefaultExport',
              data: {
                exportType: 'FunctionExpression',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Multiple allowances', () => {
    ruleTester.run('allow multiple types', noAnonymousDefaultExport, {
      valid: [
        // All anonymous exports allowed
        {
          code: 'export default () => {};',
          options: [{ allowArrowFunction: true, allowFunctionExpression: true, allowClassExpression: true }],
        },
        {
          code: 'export default function() {};',
          options: [{ allowArrowFunction: true, allowFunctionExpression: true, allowClassExpression: true }],
        },
        {
          code: 'export default class {};',
          options: [{ allowArrowFunction: true, allowFunctionExpression: true, allowClassExpression: true }],
        },
        // Named exports still valid
        {
          code: 'export default function myFunc() {};',
          options: [{ allowArrowFunction: true, allowFunctionExpression: true, allowClassExpression: true }],
        },
        {
          code: 'export default class MyClass {};',
          options: [{ allowArrowFunction: true, allowFunctionExpression: true, allowClassExpression: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Call expressions (HOCs, wrappers)', () => {
    ruleTester.run('allow call expressions', noAnonymousDefaultExport, {
      valid: [
        // React.forwardRef
        {
          code: 'export default React.forwardRef(() => null);',
        },
        // Higher-order components
        {
          code: 'export default withRouter(Component);',
        },
        // Other HOCs
        {
          code: 'export default connect(mapStateToProps)(Component);',
        },
        // Complex call expressions
        {
          code: 'export default compose(withRouter, withAuth)(Component);',
        },
        // Call expressions with anonymous functions
        {
          code: 'export default someHOC(() => null);',
        },
        // Call expressions with anonymous classes
        {
          code: 'export default decorator(class {});',
        },
      ],
      invalid: [],
    });
  });

  describe('Guidance capabilities', () => {
    ruleTester.run('provide naming guidance for anonymous exports', noAnonymousDefaultExport, {
      valid: [],
      invalid: [
        // Simple arrow function (provides guidance)
        {
          code: 'export default () => {};',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
            },
          ],
        },
        // Simple function expression (provides guidance)
        {
          code: 'export default function() {};',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
            },
          ],
        },
        // Arrow function with parameters (no auto-fix)
        {
          code: 'export default (param) => param * 2;',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
              data: {
                exportType: 'ArrowFunctionExpression',
              },
            },
          ],
        },
        // Complex function expression (no auto-fix)
        {
          code: 'export default function(a, b) { return a + b; };',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
              data: {
                exportType: 'FunctionExpression',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Suggestion capabilities', () => {
    ruleTester.run('provide helpful suggestions', noAnonymousDefaultExport, {
      valid: [],
      invalid: [
        // Arrow function suggestion
        // Function expression suggestion
        {
          code: 'export default function() { return "hello"; };',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
            },
          ],
        },
        // Class expression suggestion
        {
          code: 'export default class { render() {} };',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript support', () => {
    ruleTester.run('handle TypeScript constructs', noAnonymousDefaultExport, {
      valid: [
        // TypeScript named function
        {
          code: 'export default function myFunc(param: string): string { return param; }',
        },
        // TypeScript named class
        {
          code: 'export default class MyComponent extends React.Component<Props> {}',
        },
        // TypeScript named class with implements
        {
          code: 'export default class MyClass implements MyInterface {};',
        },
      ],
      invalid: [
        // TypeScript anonymous arrow function
        // TypeScript anonymous function expression
        // TypeScript anonymous class
        {
          code: 'export default class extends React.Component<Props, State> {};',
          errors: [
            {
              messageId: 'anonymousDefaultExport',
              data: {
                exportType: 'ClassExpression',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', noAnonymousDefaultExport, {
      valid: [
        // Export default from import
        {
          code: 'export { default } from "./module";',
        },
        {
          code: 'export { default as renamed } from "./module";',
        },
      ],
      invalid: [
        // Anonymous exports in different contexts
        {
          code: `
            export default () => {};
            export default function() {};
            export default class {};
          `,
          errors: [
            {
              messageId: 'anonymousDefaultExport',
            },
            {
              messageId: 'anonymousDefaultExport',
            },
            {
              messageId: 'anonymousDefaultExport',
            },
          ],
        },
      ],
    });
  });
});
