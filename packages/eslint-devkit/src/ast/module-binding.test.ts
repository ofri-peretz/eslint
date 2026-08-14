/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { describe, expect } from 'vitest';
import { isModuleBinding, resolveModuleBinding, type ModuleBindingOptions } from './module-binding';

/**
 * Every `invalid` case below is a shape the previous name-matching approach MISSED —
 * they are transcribed from the eslint-plugin-security corpus cases we failed
 * (`benchmarks/corpus/competitor-parity/`). If a change re-breaks module resolution,
 * these go quiet and the suite goes red.
 *
 * The probe reports any call whose callee resolves to the module/export under test.
 */
const createRule = ESLintUtils.RuleCreator(() => 'https://example.test/probe');

const makeProbe = (module: string, exportPath: string[] | undefined, options: ModuleBindingOptions = {}) =>
  createRule({
    name: 'probe',
    meta: {
      type: 'problem',
      docs: { description: 'test probe' },
      messages: { hit: 'resolved' },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      return {
        CallExpression(node: TSESTree.CallExpression) {
          const scope = context.sourceCode.getScope(node);
          if (isModuleBinding(node.callee, scope, module, exportPath, options)) {
            context.report({ node, messageId: 'hit' });
          }
        },
        MemberExpression(node: TSESTree.MemberExpression) {
          // Catch `require('child_process')` used as a bare expression statement.
          if (node.parent?.type === AST_NODE_TYPES.CallExpression) return;
          const scope = context.sourceCode.getScope(node);
          if (isModuleBinding(node, scope, module, exportPath, options)) {
            context.report({ node, messageId: 'hit' });
          }
        },
      };
    },
  });

const ruleTester = new RuleTester();

describe('resolveModuleBinding', () => {
  ruleTester.run('child_process.exec through every binding shape', makeProbe('child_process', ['exec']), {
    valid: [
      // Same method name, different module — the collision a name matcher cannot avoid.
      { code: `const db = require('mysql2'); db.exec('x');` },
      { code: `const notFs = { exec: () => {} }; notFs.exec('x');` },
      { code: `import { exec } from 'some-other-pkg'; exec('x');` },
      // Reassignment defeats resolution — abstain rather than guess.
      { code: `let cp = require('child_process'); cp = other; cp.exec('x');` },
    ],
    invalid: [
      { code: `const cp = require('child_process'); cp.exec(c);`, errors: 1 },
      // `node:` protocol — 5 of our 10 child-process misses were this alone.
      { code: `const cp = require('node:child_process'); cp.exec(c);`, errors: 1 },
      { code: `import cp from 'node:child_process'; cp.exec(c);`, errors: 1 },
      { code: `import * as cp from 'node:child_process'; cp.exec(c);`, errors: 1 },
      // Chained directly off require.
      { code: `require('child_process').exec(c);`, errors: 1 },
      { code: `require('node:child_process').exec(c);`, errors: 1 },
      // Destructured, including renamed.
      { code: `const { exec } = require('node:child_process'); exec(c);`, errors: 1 },
      { code: `const { exec: run } = require('child_process'); run(c);`, errors: 1 },
      { code: `import { exec } from 'child_process'; exec(c);`, errors: 1 },
      { code: `import { exec as run } from 'node:child_process'; run(c);`, errors: 1 },
      // Method plucked onto a variable. Two hits by design: the probe resolves the
      // `require('child_process').exec` member expression in the declaration AND the
      // later `run(c)` callee. Both are correct resolutions — a real rule reports the
      // call site only, but this probe deliberately reports every resolution it can make.
      { code: `const run = require('child_process').exec; run(c);`, errors: 2 },
    ],
  });

  ruleTester.run('fs.promises.readFile through nested namespaces', makeProbe('fs', ['promises', 'readFile']), {
    valid: [{ code: `const fs = require('fs'); fs.readFile(f);` }],
    invalid: [
      { code: `const p = require('fs').promises; p.readFile(f);`, errors: 1 },
      { code: `const p = require('node:fs').promises; p.readFile(f);`, errors: 1 },
      { code: `const fs = require('fs'); const { readFile } = fs.promises; readFile(f);`, errors: 1 },
      { code: `const fs = require('fs'); const { readFile: alias } = fs.promises; alias(f);`, errors: 1 },
    ],
  });

  ruleTester.run('module equivalents are configurable', makeProbe('fs', ['readFile'], { equivalents: { 'fs-extra': 'fs', 'graceful-fs': 'fs' } }), {
    valid: [{ code: `const x = require('unrelated-pkg'); x.readFile(f);` }],
    invalid: [
      { code: `const fse = require('fs-extra'); fse.readFile(f);`, errors: 1 },
      { code: `import { readFile } from 'fs-extra'; readFile(f);`, errors: 1 },
      { code: `const g = require('graceful-fs'); g.readFile(f);`, errors: 1 },
    ],
  });

  ruleTester.run('module root matches when no export path is given', makeProbe('child_process', undefined), {
    valid: [{ code: `const x = require('other'); x.y();` }],
    invalid: [{ code: `const cp = require('node:child_process'); cp.spawn(c);`, errors: 1 }],
  });
});

describe('destructuring shapes the resolver cannot follow', () => {
  ruleTester.run('abstains rather than guessing', makeProbe('fs', ['readFile']), {
    valid: [
      // Computed key — the source export name is not knowable statically.
      `const key = 'readFile'; const { [key]: fn } = require('fs'); fn(p);`,
      // Rest element — no key maps to this binding.
      `const { ...rest } = require('fs'); rest.readFile(p);`,
      // Nested pattern — the bound name is not a direct property value.
      `const { promises: { readFile: { call: c } } } = require('fs'); c(p);`,
      // Shorthand for a DIFFERENT export.
      `const { writeFile } = require('fs'); writeFile(p);`,
    ],
    invalid: [
      // String-literal key naming the same export.
      { code: `const { 'readFile': alias } = require('fs'); alias(p);`, errors: 1 },
    ],
  });
});

describe('ESM import forms', () => {
  ruleTester.run('import shapes', makeProbe('fs', ['readFile']), {
    valid: [
      // `import x = require(...)` resolves through a TSImportEqualsDeclaration, which
      // carries no `source` — abstain rather than guess.
      { code: `import fs = require('fs'); fs.readFile(p);`, filename: 'a.ts' },
    ],
    invalid: [
      // String-literal import specifier.
      { code: `import { 'readFile' as alias } from 'fs'; alias(p);`, errors: 1 },
    ],
  });
});

describe('defensive paths', () => {
  ruleTester.run('never throws, never guesses', makeProbe('fs', ['readFile']), {
    valid: [
      // Cyclic initialisers must terminate.
      `const a = b; const b = a; a.readFile(p);`,
      // Dynamic require specifier — the module is not statically knowable.
      `const m = require(name); m.readFile(p);`,
      // Declaration with no initialiser.
      `let fs; fs.readFile(p);`,
      // Non-string literal key in a destructuring pattern.
      `const { 0: fn } = require('fs'); fn(p);`,
      // Undeclared identifier — nothing to resolve.
      `unknownThing.readFile(p);`,
      // Non-string require specifier.
      `const m = require(123); m.readFile(p);`,
      // Private class field as the member — never a module export.
      { code: `class C { #fs; m() { this.#fs.readFile(p); } }`, filename: 'a.ts' },
      // Computed property in the destructuring pattern, alongside the target name.
      `const k='x'; const { [k]: a, other: readFile } = require('fs'); readFile(p);`,
      // Rest element sits before any matching property.
      `const { ...others } = require('fs'); others.readFile(p);`,
    ],
    invalid: [],
  });
});

/**
 * Exhaustive sweep: resolve EVERY node in a source file.
 *
 * The probes above only ever hand the resolver a call callee, which cannot reach its
 * defensive guards (private members, rest patterns, non-string require specifiers).
 * Walking every node exercises them the way a real rule set eventually will, and asserts
 * the contract that matters: it returns a binding or undefined, and never throws.
 */
const sweepRule = createRule({
  name: 'sweep',
  meta: { type: 'problem', docs: { description: 'sweep' }, messages: { hit: 'x' }, schema: [] },
  defaultOptions: [],
  create(context) {
    return {
      '*'(node: TSESTree.Node) {
        const result = resolveModuleBinding(node, context.sourceCode.getScope(node), {
          equivalents: { 'fs-extra': 'fs' },
        });
        if (result !== undefined) {
          expect(typeof result.module).toBe('string');
          expect(Array.isArray(result.path)).toBe(true);
        }
      },
    };
  },
});

describe('resolver sweep over every node', () => {
  ruleTester.run('never throws', sweepRule, {
    valid: [
      { code: `class C { #fs; m() { return this.#fs; } }`, filename: 'a.ts' },
      `const { ...rest } = require('fs'); rest;`,
      `const m = require(123); m;`,
      `const k = 'a'; const { [k]: v } = require('fs'); v;`,
      `const { 0: n } = require('fs'); n;`,
      `let undef; undef;`,
      `import fse from 'fs-extra'; fse.readFile;`,
      `const a = b; const b = a; a;`,
      `require('fs').promises.readFile;`,
      `obj['computed'];`,
      // L61: a CallExpression whose callee is not `require`.
      `notRequire('fs'); obj.method(); (function () {})();`,
      // L76: destructuredKey reached with an ArrayPattern rather than an ObjectPattern.
      `const [first] = require('fs'); first;`,
      // L84: a multi-property pattern where the first property is not the bound name,
      // so the loop must skip it before matching the second.
      `const { readFile, writeFile } = require('fs'); writeFile;`,
    ],
    invalid: [],
  });
});
