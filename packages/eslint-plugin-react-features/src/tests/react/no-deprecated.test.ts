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
      { name: 'a current API', code: 'import { createRoot } from "react-dom/client";' },
      'import { StrictMode } from "react";',
      'import React from "react"; React.createElement("div");',
      // Regular code
      'const render = () => {};',
      'function findDOMNode() {}',
      {
        name: 'a local object named ReactDOM is not react-dom',
        code: 'const ReactDOM = { render: (a, b) => a }; ReactDOM.render(<App />, el);',
      },
      {
        name: 'componentWillMount on a Component from another library',
        code: 'import { Component } from "./lib"; class A extends Component { componentWillMount() {} }',
      },
      {
        name: 'componentWillMount on a class that is not a component',
        code: 'class Store { componentWillMount() {} }',
      },
      {
        name: 'a bare render the file never imports names no module',
        code: 'render(<App />, el);',
      },
    ],
    invalid: [
      {
        name: 'ReactDOM.render, removed in React 18',
        code: 'import ReactDOM from "react-dom"; ReactDOM.render(<App />, container);',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        code: 'import ReactDOM from "react-dom"; ReactDOM.unmountComponentAtNode(container);',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'a renamed render import from react-dom',
        code: 'import { render as mount } from "react-dom"; mount(<App />, el);',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'hydrate on a react-dom namespace import',
        code: 'import * as Dom from "react-dom"; Dom.hydrate(<App />, el);',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'a named PropTypes import from react',
        code: 'import { PropTypes } from "react"; const t = PropTypes.string;',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'componentWillMount on a renamed Component import',
        code: 'import { Component as Base } from "react"; class A extends Base { componentWillMount() {} render() { return null; } }',
        errors: [{ messageId: 'deprecated' }],
      },
      {
        name: 'a quoted componentWillUpdate key on a namespace-import component',
        code: 'import * as R from "react"; class A extends R.Component { "componentWillUpdate"() {} render() { return null; } }',
        errors: [{ messageId: 'deprecated' }],
      },
    ],
  });
});
