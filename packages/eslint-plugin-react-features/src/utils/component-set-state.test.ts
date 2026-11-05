/**
 * Unit tests for componentSetState: where a class component calls its own
 * setState.
 */
import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { componentSetState, type SetStateSite } from './component-set-state';

/** The site of the last call in `code`. */
function site(code: string): SetStateSite | null | undefined {
  let found: SetStateSite | null | undefined;
  const linter = new Linter({ configType: 'flat' });
  linter.verify(
    code,
    [
      {
        files: ['**/*.ts'],
        languageOptions: { parser: tsParser },
        plugins: {
          probe: {
            rules: {
              probe: {
                create(context) {
                  return {
                    CallExpression(node) {
                      found = componentSetState(
                        node as TSESTree.CallExpression,
                        context.sourceCode as never,
                      );
                    },
                  };
                },
              },
            },
          },
        },
        rules: { 'probe/probe': 'error' },
      },
    ],
    'x.ts',
  );
  return found;
}

const inMethod = (body: string, head = 'componentDidUpdate()') =>
  `import { Component } from 'react'; class A extends Component { ${head} { ${body} } }`;

describe('componentSetState', () => {
  it('a direct call', () => {
    expect(site(inMethod('this.setState({});'))).toEqual({
      method: 'componentDidUpdate',
      conditional: false,
      inCallback: false,
    });
  });

  it.each([
    'if (x) { this.setState({}); }',
    'if (x) {} else this.setState({});',
    'x ? this.setState({}) : null;',
    'x && this.setState({});',
    'x ?? this.setState({});',
    'switch (x) { case 1: this.setState({}); }',
  ])('%s is conditional', (body) => {
    expect(site(inMethod(body))?.conditional).toBe(true);
  });

  it('a call in the test of an if is not conditional', () => {
    expect(site(inMethod('if (this.setState({})) {}'))?.conditional).toBe(
      false,
    );
  });

  it.each([
    'load().then(() => this.setState({}));',
    'setTimeout(function () { this.setState({}); }.bind(this));',
  ])('%s is in a callback', (body) => {
    expect(site(inMethod(body))?.inCallback).toBe(true);
  });

  it.each([
    ['an unbound function', 'setTimeout(function () { this.setState({}); });'],
    [
      'a function bound to another object',
      'f(function () { this.setState({}); }.bind(o));',
    ],
    [
      'a function called with bind but no argument',
      'f(function () { this.setState({}); }.bind());',
    ],
    ['bind read but not called', 'f(function () { this.setState({}); }.bind);'],
    ['a function declaration', 'function g() { this.setState({}); }'],
    ['another object', 'store.setState({});'],
    ['another method', 'this.update({});'],
    ['a computed callee', 'this[k]({});'],
  ])('%s is not the component setState', (_, body) => {
    expect(site(inMethod(body))).toBeNull();
  });

  it('an arrow-property method and a computed key', () => {
    expect(
      site(
        "import { Component } from 'react'; class A extends Component { m = () => { this.setState({}); }; }",
      )?.method,
    ).toBe('m');
    expect(site(inMethod('this.setState({});', '[k]()'))?.method).toBeNull();
  });

  it('not a React component, a static member, or top-level this', () => {
    expect(
      site('class A { componentDidMount() { this.setState({}); } }'),
    ).toBeNull();
    expect(site(inMethod('this.setState({});', 'static m()'))).toBeNull();
    expect(site('this.setState({});')).toBeNull();
  });

  it('a class expression component', () => {
    expect(
      site(
        "import React from 'react'; const A = class extends React.Component { componentDidMount() { this.setState({}); } };",
      )?.method,
    ).toBe('componentDidMount');
  });
});
