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
