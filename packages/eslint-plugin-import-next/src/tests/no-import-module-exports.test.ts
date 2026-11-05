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
    {
      name: 'a type-only import is erased and mixes nothing with CommonJS',
      code: `import type { Dep } from './dep'; module.exports = { run: 1 };`,
    },
    {
      name: "a wrapper's module and exports parameters are not the CommonJS globals",
      code: `import dep from './dep'; function wrap(module: any, exports: any) { module.exports = exports; exports.run = dep; }`,
    },
    {
      name: 'exceptions: a file matching a glob is exempt',
      code: `import dep from './dep'; module.exports = dep;`,
      filename: '/repo/scripts/build.ts',
      options: [{ exceptions: ['**/scripts/**'] }],
    },
    // Pure ESM
    {
      name: 'an ES export',
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
    {
      name: 'exceptions: a file no glob matches is still reported',
      code: `import dep from './dep'; module.exports = dep;`,
      filename: '/repo/src/app.ts',
      options: [{ exceptions: ['**/scripts/**'] }],
      errors: [{ messageId: 'importModuleExports' }],
    },
    // Import with module.exports
    {
      name: 'module.exports in a file that also uses import',
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
