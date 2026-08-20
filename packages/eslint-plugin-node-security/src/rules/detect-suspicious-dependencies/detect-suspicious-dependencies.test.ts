/**
 * @fileoverview Tests for detect-suspicious-dependencies
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as tsParser from '@typescript-eslint/parser';
import { detectSuspiciousDependencies } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('detect-suspicious-dependencies', detectSuspiciousDependencies, {
  valid: [
      // Regression: legitimate packages that sit within edit distance 2 of a
      // popular one. `preact` was reported on okta/okta-signin-widget, which
      // imports it deliberately; `recast` is the AST library jscodeshift is
      // built on. Neither is an attack.
      {
        code: "import { h, render } from 'preact';",
      },
      {
        code: "import recast from 'recast';",
      },
        'const x = 42;',
        'const flag = true;',
    // Valid popular package names
    { code: "import React from 'react'" },
    { code: "import _ from 'lodash'" },
    { code: "import express from 'express'" },
    // Local imports
    { code: "import foo from './foo'" },
    // Scoped packages
    { code: "import pkg from '@scope/package'" },
  ],

  invalid: [
    // Typosquatting-like names (within 2 Levenshtein distance of popular packages)
    { code: "import r from 'reakt'", errors: [{ messageId: 'violationDetected' }] },
    // Transposition — the most common squat shape. One slip, not two edits.
    { code: "import r from 'raect'", errors: [{ messageId: 'violationDetected' }] },
    { code: "import e from 'exprses'", errors: [{ messageId: 'violationDetected' }] },
    { code: "import l from 'lodas'", errors: [{ messageId: 'violationDetected' }] },
  ],
});

/**
 * Regression lock: a typosquat is a typosquat in every module system.
 *
 * This rule registered `ImportDeclaration` and nothing else — it was its only
 * visitor. So the dependency spelling most Node packages actually use,
 * `require('reqeust')`, was not under-reported: there was no code path that
 * could ever see it, and the rule was dead in every CommonJS file in the
 * ecosystem. A supply-chain rule that only reads ESM is a supply-chain rule
 * with a documented bypass.
 *
 * A second RuleTester because `import x = require('y')` is TypeScript syntax
 * and the default parser above cannot parse it — a shared tester would report
 * a parse error and look like a miss.
 */
const tsRuleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

tsRuleTester.run('detect-suspicious-dependencies — module forms', detectSuspiciousDependencies, {
  valid: [
    // The same four spellings, loading a package that is not a squat. Without
    // these the suite would still pass if every new arm reported on everything.
    { code: "const react = require('react');" },
    { code: "import react = require('react');" },
    { code: "export async function boot() { return import('react'); }" },
    { code: "const local = require('./reakt');" },
    // A scoped name is namespaced by its owner and cannot squat a bare one.
    { code: "const r = require('@scope/reakt');" },
    // A computed specifier carries no name to compare.
    { code: 'const r = require(name);' },
    { code: 'export async function boot() { return import(name); }' },
    // `require` bound as a local parameter is not a module load.
    { code: 'export function wrap(fn) { return fn(1); }' },
    // A non-Identifier callee is not `require` however it is spelled.
    { code: "console.log('reakt');" },
    // `import A = B.C` aliases a namespace; nothing is loaded.
    { code: 'import A = B.C;' },
    // A non-string specifier carries no package name to compare.
    { code: 'export async function boot() { return import(42); }' },
    { code: 'const r = require(42);' },
  ],
  invalid: [
    {
      code: "const r = require('reakt');",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "const { get } = require('raect');",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "import r = require('exprses');",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "export async function boot() { return import('lodas'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/**
 * Regression lock — four evasions the benchmark corpus proved, each of which
 * loaded exactly the same impostor package as a case the rule already caught.
 *
 * 1. **Sub-path entry points.** `import 'loadsh/fp'` installs the package
 *    `loadsh`. Comparing the WHOLE specifier pushed the squat's edit distance
 *    past the threshold, and in the other direction inflated the distance of an
 *    ordinary deep import (`lodash/debounce.js`) — the rule was wrong about
 *    both, from the same line.
 * 2. **Re-exports.** A barrel file is where a modern codebase writes dependency
 *    names most often, and the rule had no visitor that could ever see one.
 * 3. **Expression specifiers.** `require(PKG)` with `const PKG = 'loadsh'`, and
 *    `require('loadsh' as string)`. Demanding a bare `Literal` at the call site
 *    meant hoisting a dependency name to a module constant — ordinary style —
 *    deleted the finding.
 * 4. **`module.createRequire`.** The documented ESM→CJS loader binds the loader
 *    to a local name, so the callee is never spelled `require`.
 */
tsRuleTester.run('detect-suspicious-dependencies — corpus regressions', detectSuspiciousDependencies, {
  valid: [
    // A deep import of the REAL package. This is the case the sub-path fix must
    // not break, and it fails on a rule that compares the whole specifier.
    { code: "import debounce from 'lodash/debounce.js';" },
    { code: "import { createElement } from 'react/jsx-runtime';" },
    { code: "export { useState } from 'react';" },
    // A re-export with no source declares a local value and loads nothing.
    { code: 'export const clientName = 1;' },
    // A `let` can be reassigned between declaration and use, so its initializer
    // proves nothing — abstain rather than guess.
    { code: "let pkg = 'react'; pkg = 'reakt'; const r = require(pkg);" },
    // A loader-shaped call whose callee resolves to something that is not
    // `module.createRequire`.
    { code: "const load = (n) => n; const r = load('reakt');" },
    { code: "const load = 5; export const r = load;" },
    // A bare `require()` names no module at all.
    { code: 'export function boot() { return require(); }' },
    { code: "import { createRequire } from 'node:module'; const req = createRequire(import.meta.url); const ok = req('react');" },
  ],
  invalid: [
    {
      code: "import fp from 'loadsh/fp';",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "export { chunk } from 'loadsh';",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "export * from 'raect';",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "const PKG = 'loadsh'; const util = require(PKG);",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "export const util = require('loadsh' as string);",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "const PKG = 'raect'; export async function boot() { return import(PKG); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "import { createRequire } from 'node:module'; const req = createRequire(import.meta.url); const r = req('raect');",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
