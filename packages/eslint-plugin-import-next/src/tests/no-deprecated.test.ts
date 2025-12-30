/**
 * Tests for no-deprecated rule (Local Scopes)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDeprecated } from '../rules/no-deprecated';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-deprecated', noDeprecated, {
  valid: [
    { code: `import { foo } from './foo';` },
    { code: `function foo() {} foo();` },
    // Deprecated but not used
    { code: `
        /** @deprecated */
        function old() {}
    `},
    // Allowed
    { 
        code: `
        /** @deprecated */
        function old() {}
        old();
        `,
        options: [{ allow: ['old'] }]
    },
    // Class method not deprecated
    { code: `class C { method() {} } new C().method();` },
    // Export default coverage (visitor execution)
    {
        code: `
        /** @deprecated */
        export default function() {}
        `
    }
  ],

  invalid: [
    // Deprecated Function
    {
      code: `
        /** @deprecated Use newFn instead */
        function old() {}
        old();
      `,
      errors: [{ 
          messageId: 'deprecatedUsage',
          suggestions: [{
              messageId: 'deprecatedUsage',
              output: `
        /** @deprecated Use newFn instead */
        function old() {}
        newFn;
      `
          }]
      }],
    },
    // Deprecated Variable
    {
      code: `
        /** @deprecated */
        var oldVar = 1;
        console.log(oldVar);
      `,
      errors: [{ messageId: 'deprecatedUsage' }]
    },
    // Deprecated Class Instantiation (NewExpression)
    {
      code: `
        /** @deprecated */
        class OldClass {}
        new OldClass();
      `,
      errors: [{ messageId: 'deprecatedUsage' }]
    },
    // Deprecated Object Member Access (MemberExpression)
    {
        code: `
        /** @deprecated */
        const obj = { prop: 1 };
        obj.prop;
        `,
        errors: [{ messageId: 'deprecatedUsage' }]
    },
    // Deprecated Export Named (Usage of it? No, Export itself isn't usage unless referenced)
    // Wait, the rule doesn't flag definition. It flags usage.
    // So "export const foo" defines it. Usage checks it.
    {
        code: `
        /** @deprecated */
        export const foo = 1;
        console.log(foo);
        `,
        errors: [{ messageId: 'deprecatedUsage' }]
    }
  ],
});
