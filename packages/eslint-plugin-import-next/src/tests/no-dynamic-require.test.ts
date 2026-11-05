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
    {
      name: 'a concatenation of string literals is a static name',
      code: `require('./plugins/' + 'a');`,
    },
    {
      name: 'esmodule: a concatenation of string literals in import() is static',
      code: `import('./plugins/' + 'a');`,
      options: [{ esmodule: true }],
    },
    // Static require is allowed
    { name: 'require of a literal', code: `require('./module');` },
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
      name: 'require of a computed path',
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
