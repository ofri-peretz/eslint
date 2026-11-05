/**
 * Unit tests for the React binding helpers shared by the rules.
 */
import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { extendsReactComponent, isReactApi, reactExport } from './react-api';

type Found = ReturnType<typeof reactExport>;

/** Run `probe` on the callee of the last call and on the last class of `code`. */
function inspect(code: string): { call: Found[]; react: boolean[] } {
  const call: Found[] = [];
  const react: boolean[] = [];
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
                      const scope = context.sourceCode.getScope(node);
                      call.push(
                        reactExport(
                          (node as TSESTree.CallExpression).callee,
                          scope as never,
                        ),
                      );
                    },
                    'ClassDeclaration, ClassExpression'(node) {
                      react.push(
                        extendsReactComponent(
                          node as TSESTree.ClassDeclaration,
                          context.sourceCode.getScope(node) as never,
                        ),
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
  return { call, react };
}

describe('reactExport', () => {
  it.each([
    ["import { useState } from 'react'; useState();", 'react', 'useState'],
    ["import { useState as useS } from 'react'; useS();", 'react', 'useState'],
    ["import React from 'react'; React.useState();", 'react', 'useState'],
    ["import * as R from 'react'; R['useState']();", 'react', 'useState'],
    ["const React = require('react'); React.useState();", 'react', 'useState'],
    [
      "import { findDOMNode } from 'react-dom'; findDOMNode();",
      'react-dom',
      'findDOMNode',
    ],
    [
      "import { createRoot } from 'react-dom/client'; createRoot();",
      'react-dom/client',
      'createRoot',
    ],
    [
      "import { useState } from 'preact/hooks'; useState();",
      'react',
      'useState',
    ],
    ["import { Component } from 'preact'; Component();", 'react', 'Component'],
    ["import * as R from 'preact/compat'; R.memo();", 'react', 'memo'],
    ['React.useState();', 'react', 'useState'],
    ['ReactDOM.render();', 'react-dom', 'render'],
    ['useState();', null, 'useState'],
  ])('%s names %s %s', (code, module, name) => {
    expect(inspect(code).call.at(-1)).toEqual({ module, name });
  });

  it.each([
    'function useState() {} useState();',
    "import { createSignal } from 'solid-js'; createSignal();",
    "import React from 'react'; React.default.useState();",
    "import React from 'react'; React[key]();",
    'const React = make(); React.useState();',
    'Other.useState();',
    'React[key]();',
    '(0, f)();',
  ])('%s names no React export', (code) => {
    expect(inspect(code).call.at(-1)).toBeNull();
  });
});

describe('isReactApi', () => {
  it('matches by module, and an ambient name in any module', () => {
    const scopeless = (code: string, name: string, module?: string) => {
      let result = false;
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
                          result = isReactApi(
                            (node as TSESTree.CallExpression).callee,
                            context.sourceCode.getScope(node) as never,
                            name,
                            module,
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
    expect(
      scopeless('ReactDOM.findDOMNode();', 'findDOMNode', 'react-dom'),
    ).toBe(true);
    expect(scopeless('React.findDOMNode();', 'findDOMNode', 'react-dom')).toBe(
      false,
    );
    expect(scopeless('findDOMNode();', 'findDOMNode', 'react-dom')).toBe(true);
    expect(scopeless('useMemo();', 'useState')).toBe(false);
    expect(
      scopeless("import { useState } from 'react'; useState();", 'useState'),
    ).toBe(true);
  });
});

describe('extendsReactComponent', () => {
  it.each([
    ["import React from 'react'; class A extends React.Component {}", true],
    [
      "import { PureComponent } from 'react'; class A extends PureComponent {}",
      true,
    ],
    [
      "import { Component as C } from 'react'; const A = class extends C {};",
      true,
    ],
    ['class A extends Component {}', true],
    ['class A extends React.PureComponent {}', true],
    ['class A {}', false],
    ['class Component {} class A extends Component {}', false],
    ["import { useState } from 'react'; class A extends useState {}", false],
    ["import { Component } from 'lit'; class A extends Component {}", false],
  ])('%s -> %s', (code, expected) => {
    expect(inspect(code).react.at(-1)).toBe(expected);
  });
});
