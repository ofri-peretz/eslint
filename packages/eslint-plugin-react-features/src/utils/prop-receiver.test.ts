/**
 * Unit tests for the prop-receiver helpers shared by the performance rules.
 */
import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { freshValue, propReceiver } from './prop-receiver';

/** The receiver of the last JSX element in `code`. */
function receiverOf(code: string): string | undefined {
  let result: string | undefined;
  const linter = new Linter({ configType: 'flat' });
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tsParser },
        plugins: {
          probe: {
            rules: {
              probe: {
                create(context) {
                  return {
                    JSXOpeningElement(node) {
                      result = propReceiver(
                        node as TSESTree.JSXOpeningElement,
                        context.sourceCode.getScope(node) as never,
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
    'x.tsx',
  );
  expect(messages.filter((m) => m.fatal)).toEqual([]);
  return result;
}

describe('propReceiver', () => {
  it.each([
    ['<div />', 'dom'],
    ['<my-widget />', 'dom'],
    ['<Foo-bar />', 'dom'],
    ['<svg:rect />', 'dom'],
    ['<Ui.Row />', 'unknown'],
    ['<Row />', 'unknown'],
    ["import { Row } from './row'; <Row />;", 'unknown'],
    ['function App({ Row }: any) { return <Row />; }', 'unknown'],
    ['var Row = () => null; var Row = () => null; <Row />;', 'unknown'],
    ['let Row = () => null; Row = other; <Row />;', 'unknown'],
    ['const { Row } = lib; <Row />;', 'unknown'],
    ['const Row = lib.Row; <Row />;', 'unknown'],
    ['const Row = make(() => null); <Row />;', 'unknown'],
    ['function Row() { return null; } <Row />;', 'plain'],
    ['const Row = () => null; <Row />;', 'plain'],
    ['const Row = function () { return null; }; <Row />;', 'plain'],
    [
      "import { forwardRef } from 'react'; const Row = forwardRef(() => null); <Row />;",
      'plain',
    ],
    [
      "import { memo } from 'react'; const Row = memo(() => null); <Row />;",
      'memo',
    ],
    [
      "import React from 'react'; class Row extends React.PureComponent {} <Row />;",
      'memo',
    ],
    [
      "import { Component } from 'react'; class Row extends Component {} <Row />;",
      'plain',
    ],
    [
      "import { Component } from 'react'; class Row extends Component { shouldComponentUpdate() { return false; } } <Row />;",
      'unknown',
    ],
    [
      "import { Component } from 'react'; class Row extends Component { shouldComponentUpdate = () => false; } <Row />;",
      'unknown',
    ],
    ['class Row extends Base {} <Row />;', 'unknown'],
    [
      "import { Component } from 'react'; const Row = class extends Component {}; <Row />;",
      'plain',
    ],
    ['const Row = class {}; <Row />;', 'unknown'],
  ])('%s -> %s', (code, expected) => {
    expect(receiverOf(code)).toBe(expected);
  });
});

/** The expression of the first statement of `code`. */
function expr(code: string): TSESTree.Node {
  const ast = parse(code);
  return (ast.body[0] as TSESTree.ExpressionStatement).expression;
}

describe('freshValue', () => {
  it.each([
    ['({ a, b })', { kind: 'object', size: 2 }],
    ['[a, , b]', { kind: 'array', size: 2 }],
    ['() => a', { kind: 'function' }],
    ['(function () {})', { kind: 'function' }],
    ['({ a } as T)', { kind: 'object', size: 1 }],
    ['([a] satisfies T)', { kind: 'array', size: 1 }],
    ['(() => a)!', { kind: 'function' }],
    ['f ? () => a : () => b', { kind: 'function' }],
    ['f ? { a } : { a, b }', { kind: 'object', size: 1 }],
    ['f ? [a, b, c] : [a, b]', { kind: 'array', size: 2 }],
    ['f ? { a } : [a]', null],
    ['f ? () => a : g', null],
    ['f ? g : () => a', null],
    ['a', null],
    ['call()', null],
  ])('%s', (code, expected) => {
    expect(freshValue(expr(code))).toEqual(expected);
  });
});
