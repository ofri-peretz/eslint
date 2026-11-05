/**
 * Unit tests for the class-string helpers shared by the component-api rules.
 */
import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  classStrings,
  isClassNameBuilder,
  valueStrings,
} from './class-strings';

/** The expression of `x = <expr>;`. */
function expr(code: string): TSESTree.Expression {
  const ast = parse(`x = ${code};`, { jsx: true });
  const stmt = ast.body[0] as TSESTree.ExpressionStatement;
  return (stmt.expression as TSESTree.AssignmentExpression).right;
}

const texts = (pieces: { text: string; whole: boolean }[]) =>
  pieces.map((p) => `${p.text}${p.whole ? '' : '~'}`);

describe('valueStrings', () => {
  it.each([
    ['"a"', ['a']],
    ['1', []],
    ['`a`', ['a']],
    ['`a${b}c`', ['a~', 'c~']],
    ['tw`a`', ['a~']],
    ['f ? "a" : "b"', ['a', 'b']],
    ['f && "a"', ['a']],
    ['f || "a"', ['a']],
    ['"a" ?? "b"', ['a', 'b']],
    ['"a" as string', ['a']],
    ['"a" satisfies string', ['a']],
    ['x!', []],
    ['g()', []],
  ])('%s', (code, expected) => {
    expect(texts(valueStrings(expr(code)))).toEqual(expected);
  });
});

describe('classStrings', () => {
  it.each([
    ['["a", , f && "b"]', ['a', 'b']],
    ['{ a: on, "b-c": on, [k]: on, ...rest }', ['a', 'b-c']],
    ['"a"', ['a']],
  ])('%s', (code, expected) => {
    expect(texts(classStrings(expr(code)))).toEqual(expected);
  });
});

describe('isClassNameBuilder', () => {
  const builder = (code: string): boolean => {
    let result = false;
    new Linter({ configType: 'flat' }).verify(
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
                        result = isClassNameBuilder(
                          (node as TSESTree.CallExpression).callee,
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
      'x.ts',
    );
    return result;
  };

  it.each([
    ["cn('a');", true],
    ["import { clsx as cx } from 'clsx'; cx('a');", true],
    ["import cx from 'clsx/lite'; cx('a');", true],
    ["import classes from 'classnames'; classes('a');", true],
    ["import { twJoin } from 'tailwind-merge'; twJoin('a');", true],
    ["import * as tw from 'tailwind-merge'; tw.twMerge('a');", true],
    ["import { format } from './utils'; format('a');", false],
    [
      "import { extendTailwindMerge } from 'tailwind-merge'; extendTailwindMerge('a');",
      false,
    ],
    ["import * as c from 'clsx'; c.default.clsx('a');", false],
    ["fmt('a');", false],
  ])('%s -> %s', (code, expected) => {
    expect(builder(code)).toBe(expected);
  });
});
