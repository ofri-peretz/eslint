/**
 * @fileoverview Tests for no-deprecated rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecated } from '../../rules/react/no-deprecated';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('no-deprecated', () => {
  ruleTester.run('no-deprecated', noDeprecated, {
    valid: [
      // Modern React APIs
      'import { createRoot } from "react-dom/client";',
      'import { StrictMode } from "react";',
      'import React from "react"; React.createElement("div");',
      // Regular code
      'const render = () => {};',
      'function findDOMNode() {}',
    ],
    invalid: [
      {
        code: 'import ReactDOM from "react-dom"; ReactDOM.render(<App />, container);',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        code: 'import ReactDOM from "react-dom"; ReactDOM.unmountComponentAtNode(container);',
        errors: [{ messageId: 'deprecated' }],
      },
    ],
  });
});
