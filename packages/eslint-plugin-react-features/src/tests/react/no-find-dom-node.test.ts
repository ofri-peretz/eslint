/**
 * @fileoverview Tests for no-find-dom-node rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noFindDomNode } from '../../rules/react/no-find-dom-node';

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

describe('no-find-dom-node', () => {
  ruleTester.run('no-find-dom-node', noFindDomNode, {
    valid: [
      // Using refs instead
      'const ref = useRef(); <div ref={ref} />',
      'class MyComponent extends React.Component { ref = React.createRef(); }',
      // Not calling findDOMNode
      'const findDOMNode = "string";',
      'const ReactDOM = { render: () => {} };',
      // Different function names
      'findNode(element);',
      'DOMNode(element);',
    ],
    invalid: [
      {
        code: 'import ReactDOM from "react-dom"; ReactDOM.findDOMNode(this);',
        errors: [{ messageId: 'noFindDOMNode' }],
      },
      {
        code: 'import { findDOMNode } from "react-dom"; findDOMNode(component);',
        errors: [{ messageId: 'noFindDOMNode' }],
      },
      {
        code: 'ReactDOM.findDOMNode(ref.current);',
        errors: [{ messageId: 'noFindDOMNode' }],
      },
    ],
  });
});
