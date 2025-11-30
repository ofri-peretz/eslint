import { RuleTester } from '@typescript-eslint/rule-tester';
import { reactInJsxScope } from '../rules/react/react-in-jsx-scope';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run('react-in-jsx-scope', reactInJsxScope, {
  valid: [
    // Valid - React is imported
    {
      name: 'import React default',
      code: `
        import React from 'react';
        const App = () => <div>Hello</div>;
      `,
    },
    {
      name: 'import React namespace',
      code: `
        import * as React from 'react';
        const App = () => <div>Hello</div>;
      `,
    },
    {
      name: 'no JSX usage',
      code: `
        const App = () => 'Hello';
      `,
    },
    {
      name: 'no JSX with other import',
      code: `
        import { useState } from 'react';
        function useCustom() { return useState(0); }
      `,
    },
    {
      name: 'React imported with JSX element in variable',
      code: `
        import React from 'react';
        const element = <span>Test</span>;
      `,
    },
    {
      name: 'React imported with JSX fragment',
      code: `
        import React from 'react';
        const App = () => <>Hello</>;
      `,
    },
    {
      name: 'React imported with nested JSX',
      code: `
        import React from 'react';
        const App = () => <div><span>Nested</span></div>;
      `,
    },
    {
      name: 'non-React import does not trigger',
      code: `
        import lodash from 'lodash';
        const x = lodash.map([1,2,3], x => x);
      `,
    },
  ],
  invalid: [
    // Invalid - JSX without React import
    {
      name: 'JSX in variable declaration without React import',
      code: `
        const element = <div>Hello</div>;
      `,
      errors: [{ messageId: 'reactInJsxScope' }],
    },
    {
      name: 'JSX in expression statement',
      code: `
        <div>Hello</div>;
      `,
      errors: [{ messageId: 'reactInJsxScope' }],
    },
    // Note: The rule only detects `import React from 'react'` or `import * as React from 'react'`
    // Named imports (useState, etc.) and aliased imports (import ReactLib from 'react') are not recognized
    // JSX fragments are detected but may not find a reportable node in all cases
  ],
});

