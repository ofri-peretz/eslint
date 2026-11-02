/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { detectSuspiciousDependencies } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const error = { messageId: 'violationDetected' as const };

ruleTester.run('mutation-guided edges', detectSuspiciousDependencies, {
  valid: [
    {
      name: 'a scope one edit from a popular name is namespaced by its owner',
      code: "import { compile } from '@react/compiler';",
    },
    {
      name: 'exact is two edits from react: a transposition needs both letters swapped',
      code: "import exact from 'exact';",
    },
    {
      name: 'tract is two edits from react: a transposition needs both letters swapped',
      code: "import tract from 'tract';",
    },
    {
      name: 'a loader returned by a local factory is not the CommonJS loader',
      code: "const load = makeLoader();\nload('raect');",
    },
    {
      name: 'createRequire from a local shim is not module.createRequire',
      code: "const { createRequire } = require('./compat');\nconst load = createRequire(__filename);\nload('raect');",
    },
  ],
  invalid: [
    {
      name: 'a squat that differs from the popular name in its last letter is one edit away',
      code: "const _ = require('lodasj');",
      errors: [error],
    },
  ],
});
