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
    { code: "import l from 'lodas'", errors: [{ messageId: 'violationDetected' }] },
  ],
});
