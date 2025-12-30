/**
 * Tests for no-import-module-exports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noImportModuleExports } from '../rules/no-import-module-exports';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-import-module-exports', noImportModuleExports, {
  valid: [
    // Pure ESM
    {
      code: `
        import foo from 'foo';
        export default foo;
      `,
    },
    {
      code: `
        import { bar } from 'bar';
        export { bar };
      `,
    },

    // Pure CommonJS (no imports)
    {
      code: `
        const foo = require('foo');
        module.exports = foo;
      `,
    },
    {
      code: `
        const bar = require('bar');
        exports.bar = bar;
      `,
    },

    // No exports at all
    {
      code: `
        import foo from 'foo';
        console.log(foo);
      `,
    },

    // module.exports without import
    {
      code: `module.exports = { foo: 1 };`,
    },
  ],

  invalid: [
    // Import with module.exports
    {
      code: `
        import foo from 'foo';
        module.exports = foo;
      `,
      errors: [{ messageId: 'importModuleExports' }],
    },

    // Import with module.exports.x
    {
      code: `
        import { bar } from 'bar';
        module.exports.bar = bar;
      `,
      errors: [{ messageId: 'importModuleExports' }],
    },

    // Import with exports.x
    {
      code: `
        import baz from 'baz';
        exports.baz = baz;
      `,
      errors: [{ messageId: 'importModuleExports' }],
    },

    // Multiple exports with import
    {
      code: `
        import foo from 'foo';
        module.exports.a = 1;
        module.exports.b = 2;
      `,
      errors: [
        { messageId: 'importModuleExports' },
        { messageId: 'importModuleExports' },
      ],
    },

    // Named import with module.exports
    {
      code: `
        import { x, y } from 'module';
        module.exports = { x, y };
      `,
      errors: [{ messageId: 'importModuleExports' }],
    },
  ],
});
