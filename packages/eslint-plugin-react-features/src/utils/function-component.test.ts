/**
 * Unit tests for isFunctionComponent: React's definition of a function
 * component.
 */
import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import { type FunctionNode, isFunctionComponent } from './function-component';

/** isFunctionComponent of the first function in `code`. */
function first(code: string): boolean | undefined {
  let found: boolean | undefined;
  const linter = new Linter({ configType: 'flat' });
  const visit = (context: { sourceCode: unknown }) => (node: unknown) => {
    found ??= isFunctionComponent(
      node as FunctionNode,
      context.sourceCode as never,
    );
  };
  linter.verify(
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
                    'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression':
                      visit(context),
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
  return found;
}

describe('isFunctionComponent', () => {
  it.each([
    'function Card() { return <div />; }',
    'const Card = () => <></>;',
    'const Card = function () { if (x) return null; return a ? b : <i />; };',
    'export default function () { return ok && <b />; }',
    "import { memo } from 'react'; const C = memo(() => null);",
    "import React from 'react'; React.forwardRef(function (p, r) { return null; });",
  ])('%s is a component', (code) => {
    expect(first(code)).toBe(true);
  });

  it.each([
    'function card() { return <div />; }',
    'function Card() { return 1; }',
    'function Card() { const f = () => <i />; return f; }',
    'function Card(this: any) { return <div />; }',
    'wrap(() => <div />);',
    'const o = { Card() { return <div />; } };',
  ])('%s is not a component', (code) => {
    expect(first(code)).toBe(false);
  });
});
