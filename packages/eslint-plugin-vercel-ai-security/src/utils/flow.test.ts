/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit tests for the bounded same-file value follower.
 *
 * Each snippet calls `sink(x)`; the question is whether `x` derives from a
 * `SOURCE()` call, with `CLEAN(...)` as a barrier. Names in the snippets are
 * deliberately meaningless: the follower must not read them.
 */
import { describe, it, expect } from 'vitest';
import { Linter, type Rule } from 'eslint';
import parser from '@typescript-eslint/parser';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { derivesFrom, isDerivationCall } from './flow';

function derived(code: string): boolean[] {
  const results: boolean[] = [];
  const rule: Rule.RuleModule = {
    create(context) {
      const sourceCode = context.sourceCode as unknown as TSESLint.SourceCode;
      const isCall = (node: TSESTree.Node, name: string) =>
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === name;
      return {
        CallExpression(node) {
          const call = node as unknown as TSESTree.CallExpression;
          if (!isCall(call, 'sink')) return;
          results.push(
            derivesFrom(call.arguments[0], {
              sourceCode,
              isSource: (n) => isCall(n, 'SOURCE'),
              isBarrier: (n) => isCall(n, 'CLEAN'),
            }),
          );
        },
      };
    },
  };
  const linter = new Linter({ configType: 'flat' });
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { t: { rules: { r: rule } } },
        rules: { 't/r': 'error' },
      },
    ],
    'case.tsx',
  );
  expect(messages.filter((m) => m.fatal)).toEqual([]);
  return results;
}

describe('derivesFrom', () => {
  it.each([
    ['a direct source', 'sink(SOURCE());', [true]],
    [
      'a ternary branch',
      'sink(ok ? SOURCE() : "x"); sink(ok ? "x" : SOURCE()); sink(ok ? "a" : "b");',
      [true, true, false],
    ],
    [
      'an object spread',
      'sink({ ...SOURCE() }); sink({ a: 1 });',
      [true, false],
    ],
    ['a barrier stops the walk', 'sink(CLEAN(SOURCE()));', [false]],
    ['a wrapper call with no argument', 'sink(String());', [false]],
    ['an unknown call', 'sink(other(SOURCE()));', [false]],
    ['a computed callee', 'sink(fns[0](SOURCE()));', [false]],
    ['an undeclared identifier', 'sink(nowhere);', [false]],
    ['a JSX expression is not followed', 'sink(<div />);', [false]],
    [
      'a reassignment cycle terminates',
      'let a; let b; a = b; b = a; sink(a);',
      [false],
    ],
    [
      'a self-referential write through a member',
      'let a = {}; a = a.next; sink(a);',
      [false],
    ],
    [
      'a const arrow helper with an expression body',
      'const f = (x) => x.trim(); sink(f(SOURCE()));',
      [true],
    ],
    [
      'a function expression helper',
      'const f = function (x) { if (x) return x; return null; }; sink(f(SOURCE()));',
      [true],
    ],
    [
      'a helper argument that is missing',
      'function f(x) { return x; } sink(f());',
      [false],
    ],
    [
      'a helper whose nested function returns are not its own',
      'function f(x) { const g = () => x; return "fixed"; } sink(f(SOURCE()));',
      [false],
    ],
    [
      'a parameter of a default-exported anonymous function',
      'export default function (x) { sink(x); }',
      [false],
    ],
    [
      'a parameter of a function passed by reference, not called',
      'function f(x) { sink(x); } register(f); f;',
      [false],
    ],
    [
      'a destructured parameter of a function declared by a pattern',
      'const [g] = [function (x) { sink(x); }]; g(SOURCE());',
      [false],
    ],
    [
      'a JSX spread attribute into a component',
      'function C(props) { sink(props.v); } export const A = () => <C {...SOURCE()} />;',
      [true],
    ],
    [
      'an empty JSX expression',
      'function C({ v }) { sink(v); } export const A = () => <C v={/* none */} />;',
      [false],
    ],
    [
      'a JSX attribute with a string value',
      'function C({ v }) { sink(v); } export const A = () => <C v="x" />;',
      [false],
    ],
    [
      'a component parameter after the props',
      'function C(p, ref) { sink(ref); } export const A = () => <C v={SOURCE()} />;',
      [false],
    ],
    [
      'a const arrow component',
      'const C = ({ v }) => { sink(v); }; export const A = () => <C v={SOURCE()} />;',
      [true],
    ],
    [
      'a function bound by an object pattern has no caller binding',
      'const { length } = function (x) { sink(x); };',
      [false],
    ],
    ['a non-element callback', 'xs.then((x) => sink(x));', [false]],
  ])('%s', (_name, code, expected) => {
    expect(derived(code)).toEqual(expected);
  });

  it('stops at the depth bound', () => {
    const chain = Array.from(
      { length: 20 },
      (_, i) => `const v${i + 1} = v${i};`,
    ).join('\n');
    expect(derived(`const v0 = SOURCE();\n${chain}\nsink(v20);`)).toEqual([
      false,
    ]);
  });

  it('stops at the work bound', () => {
    const wide = Array.from({ length: 4100 }, () => 'z').join(', ');
    expect(derived(`const z = 1; sink([${wide}, SOURCE()]);`)).toEqual([false]);
  });
});

describe('flow helpers', () => {
  it('isDerivationCall is false for a non-call and a bare call', () => {
    expect(isDerivationCall({ type: 'Identifier' } as TSESTree.Node)).toBe(
      false,
    );
    expect(
      isDerivationCall({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'map' },
      } as TSESTree.Node),
    ).toBe(false);
  });
});
