/**
 * Tests for no-dynamic-require
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDynamicRequire } from '../rules/no-dynamic-require';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-dynamic-require', noDynamicRequire, {
  valid: [
    // Static require is allowed
    { code: `require('./module');` },
    { code: `require('lodash');` },
    { code: `require(\`template-literal-no-expressions\`);` },

    // Static dynamic import
    { code: `import('./module');` },
    { code: `import('lodash');` },

    // Dynamic import not checked by default
    { code: `import(variable);` },
    { code: `import(\`./\${path}\`);` },

    // Non-require calls
    { code: `notRequire(variable);` },
    { code: `obj.require(variable);` },
  ],

  invalid: [
    // Dynamic require with variable
    {
      code: `require(variable);`,
      errors: [{ messageId: 'dynamicRequire' }],
    },

    // Dynamic require with expression
    {
      code: `require('./modules/' + name);`,
      errors: [{ messageId: 'dynamicRequire' }],
    },

    // Dynamic require with template literal containing expressions
    {
      code: `require(\`./modules/\${name}\`);`,
      errors: [{ messageId: 'dynamicRequire' }],
    },

    // Dynamic require with function call
    {
      code: `require(getModulePath());`,
      errors: [{ messageId: 'dynamicRequire' }],
    },

    // Dynamic import when esmodule option is true
    {
      code: `import(variable);`,
      options: [{ esmodule: true }],
      errors: [{ messageId: 'dynamicImport' }],
    },
    {
      code: `import(\`./\${path}\`);`,
      options: [{ esmodule: true }],
      errors: [{ messageId: 'dynamicImport' }],
    },
    {
      code: `import(getModule());`,
      options: [{ esmodule: true }],
      errors: [{ messageId: 'dynamicImport' }],
    },
  ],
});
