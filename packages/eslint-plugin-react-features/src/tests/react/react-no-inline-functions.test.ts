/**
 * Comprehensive tests for react-no-inline-functions rule
 * Performance: Detects inline functions in React renders
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { reactNoInlineFunctions } from '../../rules/performance/react-no-inline-functions';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

const MEMO_ROW =
  "import { memo } from 'react'; const Row = memo((p) => <i>{p.x}</i>);";

describe('react-no-inline-functions', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no inline functions', reactNoInlineFunctions, {
      valid: [
        // No inline functions
        {
          name: 'no JSX prop at all',
          code: 'function MyComponent() { return <div>Hello</div>; }',
        },
        // Event handlers (if allowed)
        {
          name: 'allowInEventHandlers exempts onClick on a component',
          code: '<Button onClick={() => handleClick()}>Click</Button>',
          options: [{ allowInEventHandlers: true }],
        },
        {
          name: 'CORRECTED: a host element has no render to save',
          code: '<button onClick={() => handleClick()}>Click</button>',
        },
        {
          name: 'a custom element is a host element',
          code: '<my-widget onSelect={() => pick()} />',
        },
        {
          name: 'a component defined without memo re-renders with its parent anyway',
          code: 'function Row(p) { return <i>{p.x}</i>; } <Row onSelect={() => pick()} />',
        },
        {
          name: 'a forwardRef component without memo',
          code: "import { forwardRef } from 'react'; const Row = forwardRef((p, r) => <i ref={r} />); <Row onSelect={() => pick()} />",
        },
        {
          name: 'a Component class without shouldComponentUpdate',
          code: "import { Component } from 'react'; class Row extends Component { render() { return null; } } <Row onSelect={() => pick()} />",
        },
        {
          name: 'a function passed by reference is not created in render',
          code: `${MEMO_ROW} <Row onSelect={pick} />`,
        },
        {
          name: 'CORRECTED: a callback passed to .map() in children is not a prop',
          code: '<Row>{items.map(() => <span>test</span>)}</Row>',
        },
        {
          name: 'a callback passed to a call in a prop is not judged (the call result is unknown)',
          code: `${MEMO_ROW} <Row onSelect={debounce(() => pick())} />`,
        },
        {
          name: 'CORRECTED: a function child of a host element',
          code: '<div>{() => console.log("test")}</div>',
        },
        {
          name: 'a local memo() that is not React\'s is not judged as memo',
          code: 'function memo(f) { return f; } const Row = (p) => <i />; <Row onSelect={() => pick()} />',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Inline Functions', () => {
    ruleTester.run('invalid - inline functions in JSX', reactNoInlineFunctions, {
      valid: [],
      invalid: [
        {
          name: 'an inline arrow in a prop',
          code: '<Button onClick={() => handleClick()}>Click</Button>',
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          name: 'an inline arrow on a memo component',
          code: `${MEMO_ROW} <Row onSelect={() => pick()} />`,
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          name: 'an inline function on React.memo(forwardRef(...))',
          code: "import * as R from 'react'; const Row = R.memo(R.forwardRef((p, r) => <i ref={r} />)); <Row onSelect={function () { pick(); }} />",
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          name: 'an inline arrow on a renamed memo import',
          code: "import { memo as pure } from 'react'; const Row = pure(() => <i />); <Row onSelect={() => pick()} />",
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          name: 'an inline arrow on a PureComponent class',
          code: "import React from 'react'; class Row extends React.PureComponent { render() { return null; } } <Row onSelect={() => pick()} />",
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          name: 'a choice between two inline functions',
          code: `${MEMO_ROW} <Row onSelect={flag ? () => a() : () => b()} />`,
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          name: 'a function child of a memo component is its children prop',
          code: `${MEMO_ROW} <Row>{(data) => <b>{data}</b>}</Row>`,
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          name: 'a component with its own shouldComponentUpdate is not known to re-render',
          code: "import { Component } from 'react'; class Row extends Component { shouldComponentUpdate() { return false; } render() { return null; } } <Row onSelect={() => pick()} />",
          errors: [{ messageId: 'inlineFunction' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', reactNoInlineFunctions, {
      valid: [
        {
          name: 'allowInEventHandlers exempts an on-handler on a memo component',
          code: `${MEMO_ROW} <Row onSelect={() => pick()} />`,
          options: [{ allowInEventHandlers: true }],
        },
        {
          name: 'minArraySize has no effect on a children callback',
          code: '<Row>{largeArray.map(() => <span>test</span>)}</Row>',
          options: [{ minArraySize: 50 }],
        },
      ],
      invalid: [
        {
          name: 'allowInEventHandlers: `only` is not an event handler',
          code: `${MEMO_ROW} <Row only={() => pick()} />`,
          options: [{ allowInEventHandlers: true }],
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          name: 'allowInEventHandlers: a render prop is not an event handler',
          code: `${MEMO_ROW} <Row renderItem={(i) => <b>{i}</b>} />`,
          options: [{ allowInEventHandlers: true }],
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          name: 'allowInEventHandlers: a function child is not an event handler',
          code: '<Loader>{function test() { return "test"; }}</Loader>',
          options: [{ allowInEventHandlers: true }],
          errors: [{ messageId: 'inlineFunction' }],
        },
        {
          name: 'a namespaced attribute is never an event handler',
          code: '<Row xlink:href={() => pick()} />',
          options: [{ allowInEventHandlers: true }],
          errors: [{ messageId: 'inlineFunction' }],
        },
      ],
    });
  });

  describe('Not in JSX', () => {
    ruleTester.run('not in JSX', reactNoInlineFunctions, {
      valid: [
        {
          code: 'const fn = () => console.log("test");',
        },
        {
          code: 'function test() { return () => {}; }',
        },
        {
          code: 'const fn = () => items.map(x => x);',
        },
        {
          name: 'a string attribute and a boolean attribute',
          code: '<Row label="x" disabled />',
        },
      ],
      invalid: [],
    });
  });
});
