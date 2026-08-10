/**
 * @fileoverview Tests for detect-suspicious-dependencies
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
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
