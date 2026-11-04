/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the package-binding probe the middleware rules use to recognise
 * `cors`, `helmet`, `express-rate-limit`, … under any local name.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { isPackageCallee, packageBindings } from './import-bindings';

const program = (code: string): TSESTree.Program =>
  parse(code, { sourceType: 'module', range: true }) as TSESTree.Program;

const bindings = (code: string, pkgs = ['pkg']) =>
  packageBindings(program(code), pkgs);

/** The callee of the file's last expression statement. */
const lastCallee = (code: string): TSESTree.Node => {
  const ast = program(code);
  const stmt = ast.body[ast.body.length - 1] as TSESTree.ExpressionStatement;
  return (stmt.expression as TSESTree.CallExpression).callee;
};

describe('packageBindings', () => {
  it.each([
    ["import a from 'pkg';", 'a'],
    ["import * as a from 'pkg';", 'a'],
    ["import { default as a } from 'pkg';", 'a'],
    ["const a = require('pkg');", 'a'],
    ["const a = require('pkg').default;", 'a'],
    ["const { default: a } = require('pkg');", 'a'],
    ["import a = require('pkg');", 'a'],
    ["export const a = require('pkg');", 'a'],
  ])('%s binds the module to %s', (code, local) => {
    expect([...bindings(code).modules]).toEqual([local]);
  });

  it.each([
    ["import { x } from 'pkg';", 'x', 'x'],
    ["import { x as y } from 'pkg';", 'y', 'x'],
    ["import { 'x' as y } from 'pkg';", 'y', 'x'],
    ["const { x } = require('pkg');", 'x', 'x'],
    ["const { x: y } = require('pkg');", 'y', 'x'],
    ["const { x: y = fallback } = require('pkg');", 'y', 'x'],
  ])('%s binds %s to the named export %s', (code, local, exported) => {
    expect(bindings(code).named.get(local)).toBe(exported);
  });

  it.each([
    "import a from 'other';",
    "import 'pkg';",
    "const a = require('other');",
    'const a = require(name);',
    'const a = require(1);',
    'const a = require();',
    'const a = mod.default;',
    'let a;',
    "const a = load('pkg');",
    'const a = 1, b = c;',
    "const { ...rest } = require('pkg');",
    "const { x: { y } } = require('pkg');",
    "const { [k]: v } = require('pkg');",
    "const [a] = require('pkg');",
    'import a = Other.Namespace;',
    "import a = require('other');",
    'export function f() {}',
    "export { a } from 'pkg';",
  ])('%s binds nothing', (code) => {
    const b = bindings(code);
    expect(b.modules.size + b.named.size).toBe(0);
  });
});

describe('isPackageCallee', () => {
  const header = "import m from 'pkg'; import { x } from 'pkg';";

  it.each([
    [`${header} m();`, undefined, true],
    [`${header} other();`, undefined, false],
    [`${header} x();`, 'x', true],
    [`${header} x();`, 'z', false],
    [`${header} m.x();`, 'x', true],
    [`${header} m['x']();`, 'x', true],
    [`${header} m.z();`, 'x', false],
    [`${header} m.x();`, undefined, false],
    [`${header} other.x();`, 'x', false],
    [`${header} m().x();`, 'x', false],
  ])('%s (export %s) → %s', (code, exportName, expected) => {
    const b = packageBindings(program(code), ['pkg']);
    expect(isPackageCallee(lastCallee(code), b, exportName)).toBe(expected);
  });
});
