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
    { name: 'an ordinary import', code: `import { foo } from './foo';` },
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
      name: 'a call to something marked @deprecated',
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

/**
 * Fidelity (benchmarks/suites/fidelity/models/import-next/no_deprecated.qnt):
 * same-file uses are followed by binding, and custom markers add to
 * `@deprecated`.
 */
ruleTester.run('no-deprecated — fidelity (same file)', noDeprecated, {
  valid: [
    {
      name: 'a parameter sharing the name is not the deprecated item',
      code: '/** @deprecated */\nfunction old() {}\nexport const f = (old: number) => old;',
    },
    {
      name: 'a JSDoc on a re-export does not mark a local',
      code: "const a = 1;\n/** @deprecated */\nexport { a } from './m';\nexport const v = a;",
    },
    {
      name: 'a JSDoc on an export of an undeclared name marks nothing',
      code: '/** @deprecated */\nexport { notDeclared };',
    },
    {
      name: 'an object key sharing the name is not a use',
      code: '/** @deprecated */\nconst old = 1;\nexport const o = { old: 2 };',
    },
  ],
  invalid: [
    {
      name: 'custom markers add to @deprecated instead of replacing it',
      code: '/** @deprecated */\nfunction old() {}\nold();',
      options: [{ deprecationMarkers: ['@obsolete'] }],
      errors: [{ messageId: 'deprecatedUsage' }],
    },
    {
      name: 'one JSDoc deprecates every declarator of the statement',
      code: '/** @deprecated */\nconst a = 1, b = 2;\nexport const v = [a, b];',
      errors: [
        { messageId: 'deprecatedUsage' },
        { messageId: 'deprecatedUsage' },
      ],
    },
    {
      name: 'a runtime-key read of a deprecated object',
      code: '/** @deprecated */\nconst old: Record<string, number> = {};\nexport const f = (k: string) => old[k];',
      errors: [{ messageId: 'deprecatedUsage' }],
    },
    {
      name: 'a use before the hoisted declaration',
      code: 'old();\n/** @deprecated */\nfunction old() {}',
      errors: [{ messageId: 'deprecatedUsage' }],
    },
  ],
});
