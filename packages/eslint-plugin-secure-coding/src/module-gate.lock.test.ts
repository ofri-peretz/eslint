/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: the exemptions in this plugin work in every module system.
 *
 * Two rules abstain in AST-tooling files, because a codemod's `node[name]` and
 * `node.key === 'foo'` are tree traversal, not user-input indexing or a secret
 * comparison. Both decided that by scanning `Program.body` for
 * `ImportDeclaration` — so the exemption existed only for ESM. A jscodeshift
 * codemod written the CommonJS way lost it entirely and every traversal in it
 * reported.
 *
 * That is the same defect as the `jwt-security` module gate with the polarity
 * reversed: there a missed spelling silenced a rule, here it fires one. Both
 * are "the module system decided whether the rule applied", which it must not.
 *
 * The suite is written as a matrix over module forms rather than one case per
 * rule, so the four spellings stay symmetric as the exemption list grows.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from './index';

const lint = (code: string, rule: string): Linter.LintMessage[] => {
  // `configType: 'flat'` because a bare `new Linter()` still defaults to
  // eslintrc on the declared ESLint floor, which would ignore the config below
  // and run nothing.
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { s: plugin as unknown as Linter.Plugin },
      rules: { [`s/${rule}`]: 'error' },
    },
    // A filename that is NOT under a `codemod/` directory and is not
    // `codemod.ts`, so the path heuristics cannot grant the exemption and the
    // module load is the only thing under test.
    'transform.ts',
  );
};

/**
 * How each AST library is loaded. `import-equals` and the dynamic form are
 * included because a codemod that supports both module systems is exactly the
 * kind of file that reaches for them.
 */
const LOADS = (pkg: string, binding: string): ReadonlyArray<readonly [string, string]> => [
  ['ESM default import', `import ${binding} from '${pkg}';`],
  ['ESM named import', `import { parse as ${binding} } from '${pkg}';`],
  ['CommonJS require', `const ${binding} = require('${pkg}');`],
  ['CommonJS destructuring require', `const { parse: ${binding} } = require('${pkg}');`],
  ["TypeScript's import-equals", `import ${binding} = require('${pkg}');`],
  [
    'a lazy dynamic import',
    `export async function boot() { const ${binding} = await import('${pkg}'); return ${binding}; }`,
  ],
];

describe('detect-object-injection — the codemod exemption', () => {
  /** The traversal shape the rule reports on when there is no exemption. */
  const traversal = `export function visit(node, name) { return node[name]; }`;

  it('reports with no AST library loaded, so the cases below are not vacuous', () => {
    expect(lint(traversal, 'detect-object-injection').length).toBeGreaterThan(0);
  });

  describe.each(LOADS('jscodeshift', 'j'))('%s', (_form, load) => {
    it('exempts the file', () => {
      expect(lint(`${load}\n${traversal}`, 'detect-object-injection')).toHaveLength(0);
    });
  });

  it('still reports when the loaded package is not AST tooling', () => {
    const code = `const j = require('left-pad');\n${traversal}`;
    expect(lint(code, 'detect-object-injection').length).toBeGreaterThan(0);
  });
});

describe('no-insecure-comparison — the codemod exemption', () => {
  /**
   * A secret-shaped strict comparison. In a codemod this is an AST identifier
   * check — `node.key === expectedKey` — which is why the exemption exists.
   */
  const comparison = `export function isFoo(node) { return node.key === expectedSecret; }`;

  it('reports with no AST library loaded, so the cases below are not vacuous', () => {
    expect(lint(comparison, 'no-insecure-comparison').length).toBeGreaterThan(0);
  });

  describe.each(LOADS('typescript', 'ts'))('%s', (_form, load) => {
    it('exempts the file', () => {
      expect(lint(`${load}\n${comparison}`, 'no-insecure-comparison')).toHaveLength(0);
    });
  });

  it('still reports when the loaded package is not AST tooling', () => {
    const code = `const ts = require('left-pad');\n${comparison}`;
    expect(lint(code, 'no-insecure-comparison').length).toBeGreaterThan(0);
  });
});
