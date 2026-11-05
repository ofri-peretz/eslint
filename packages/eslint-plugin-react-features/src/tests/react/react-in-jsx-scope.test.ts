import { RuleTester } from '@typescript-eslint/rule-tester';
import { reactInJsxScope } from '../../rules/react/react-in-jsx-scope';

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
    {
      name: 'React from a require is in scope',
      code: `
        const React = require('react');
        export function App() { return <div>Hello</div>; }
      `,
    },
    {
      name: 'the automatic runtime pragma needs no React',
      code: `
        /** @jsxRuntime automatic */
        export function App() { return <div>Hello</div>; }
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
    {
      name: 'JSX inside a component with no React in scope',
      code: `
        export function App() { return <div>Hello</div>; }
      `,
      errors: [{ messageId: 'reactInJsxScope' }],
    },
    {
      name: 'a fragment with only named React imports',
      code: `
        import { useState } from 'react';
        export function App() { useState(0); return <>Hello</>; }
      `,
      errors: [{ messageId: 'reactInJsxScope' }],
    },
    {
      name: 'a type-only React import is erased',
      code: `
        import type React from 'react';
        export const el: React.ReactNode = <span>Hi</span>;
      `,
      errors: [{ messageId: 'reactInJsxScope' }],
    },
    {
      name: 'a type-only import specifier named React is erased',
      code: `
        import { type React } from './types';
        export const el = <span>Hi</span>;
      `,
      errors: [{ messageId: 'reactInJsxScope' }],
    },
    {
      name: 'a type alias named React is not a value',
      code: `
        type React = { version: string };
        export const el = <span>Hi</span>;
      `,
      errors: [{ messageId: 'reactInJsxScope' }],
    },
    {
      name: 'React imported under another name',
      code: `
        import ReactLib from 'react';
        export const el = <span>{ReactLib.version}</span>;
      `,
      errors: [{ messageId: 'reactInJsxScope' }],
    },
  ],
});

