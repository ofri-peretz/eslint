/**
 * Tests for no-self-import rule
 * Forbid a module from importing itself
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSelfImport } from '../rules/no-self-import';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-self-import', () => {
  describe('Basic self-import detection', () => {
    ruleTester.run('detect self-imports in ES6 modules', noSelfImport, {
      valid: [
        // Normal imports
        {
          code: 'import lodash from "lodash";',
          filename: '/src/utils/helpers.js',
        },
        {
          code: 'import { Component } from "react";',
          filename: '/src/components/Button.js',
        },
        // Relative imports to other files
        {
          code: 'import helper from "./helper";',
          filename: '/src/utils/main.js',
        },
        {
          code: 'import config from "../config";',
          filename: '/src/utils/helpers.js',
        },
        // No imports
        {
          code: 'console.log("hello");',
          filename: '/src/utils/helpers.js',
        },
      ],
      invalid: [
        // Self-import with same name
        {
          code: 'import helpers from "./helpers";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.js',
                reason:
                  'A module cannot import itself, which would create a circular dependency',
              },
            },
          ],
        },
        // Self-import with different extension
        {
          code: 'import helpers from "./helpers.ts";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers.ts',
                currentFile: '/src/utils/helpers.js',
                reason:
                  'A module cannot import itself, which would create a circular dependency',
              },
            },
          ],
        },
        // Self-import with index
        {
          code: 'import main from "./index";',
          filename: '/src/utils/index.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './index',
                currentFile: '/src/utils/index.js',
              },
            },
          ],
        },
        // Self-import going up and down
        {
          code: 'import utils from "../utils/helpers";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: '../utils/helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Require self-imports', () => {
    ruleTester.run('detect self-requires', noSelfImport, {
      valid: [
        // Normal requires
        {
          code: 'const lodash = require("lodash");',
          filename: '/src/utils/helpers.js',
        },
        // Require other files
        {
          code: 'const config = require("../config");',
          filename: '/src/utils/helpers.js',
        },
      ],
      invalid: [
        // Self-require with same name
        {
          code: 'const helpers = require("./helpers");',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.js',
                reason:
                  'A module cannot require itself, which would create a circular dependency',
              },
            },
          ],
        },
        // Self-require with different extension
        {
          code: 'const helpers = require("./helpers.ts");',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers.ts',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Allow in tests', () => {
    ruleTester.run('allow self-imports in test files', noSelfImport, {
      valid: [
        // Self-import in test file (allowed)
        {
          code: 'import helpers from "./helpers";',
          filename: '/src/utils/helpers.test.js',
          options: [{ allowInTests: true }],
        },
        {
          code: 'const helpers = require("./helpers");',
          filename: '/src/__tests__/helpers.spec.js',
          options: [{ allowInTests: true }],
        },
        {
          code: 'import helpers from "./helpers";',
          filename: '/src/utils/__tests__/helpers.js',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        // Self-import in regular file (not allowed)
        {
          code: 'import helpers from "./helpers";',
          filename: '/src/utils/helpers.js',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Import types', () => {
    ruleTester.run('handle different import types', noSelfImport, {
      valid: [
        // Package imports (not self-imports)
        {
          code: 'import express from "express";',
          filename: '/src/server.js',
        },
        // Relative imports to different files
        {
          code: 'import config from "../config";',
          filename: '/src/utils/helpers.js',
        },
      ],
      invalid: [
        // Default import
        {
          code: 'import helpers from "./helpers";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
            },
          ],
        },
        // Named imports
        {
          code: 'import { helper } from "./helpers";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
        // Namespace imports
        {
          code: 'import * as helpers from "./helpers";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
        // Dynamic imports
        {
          code: 'const helpers = import("./helpers");',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Complex path resolution', () => {
    ruleTester.run('handle complex relative paths', noSelfImport, {
      valid: [
        // Import from different directory with same name
        {
          code: 'import helpers from "../components/helpers";',
          filename: '/src/utils/helpers.js',
        },
        // Import parent directory module
        {
          code: 'import utils from "../utils";',
          filename: '/src/utils/helpers.js',
        },
      ],
      invalid: [
        // Complex relative path that resolves to self
        {
          code: 'import helpers from "../utils/helpers";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: '../utils/helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
        // Deep nested path resolution
        {
          code: 'import helpers from "../../src/utils/helpers";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: '../../src/utils/helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
        // Self-import through index file
        {
          code: 'import helpers from "./index";',
          filename: '/src/utils/index.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './index',
                currentFile: '/src/utils/index.js',
              },
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript support', () => {
    ruleTester.run('handle TypeScript constructs', noSelfImport, {
      valid: [
        // Type-only imports
        {
          code: 'import type { Helper } from "./helpers";',
          filename: '/src/utils/helpers.ts',
        },
        // Type imports from different files
        {
          code: 'import type { Config } from "../config";',
          filename: '/src/utils/helpers.ts',
        },
      ],
      invalid: [
        // Self-import in TypeScript
        {
          code: 'import helpers from "./helpers";',
          filename: '/src/utils/helpers.ts',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.ts',
              },
            },
          ],
        },
        // Self-import with .ts extension
        {
          code: 'import helpers from "./helpers.ts";',
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers.ts',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', noSelfImport, {
      valid: [
        // No filename (should skip)
        {
          code: 'import helpers from "./helpers";',
          filename: '',
        },
        // Package imports (not relative)
        {
          code: 'import react from "react";',
          filename: '/src/components/Button.js',
        },
      ],
      invalid: [
        // Multiple self-imports in same file
        {
          code: `
            import helpers from "./helpers";
            const helpers2 = require("./helpers");
            import * as helpers3 from "./helpers";
          `,
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
        // Self-import in different statement positions
        {
          code: `
            console.log("before");
            import helpers from "./helpers";
            console.log("after");
          `,
          filename: '/src/utils/helpers.js',
          errors: [
            {
              messageId: 'selfImport',
              data: {
                importPath: './helpers',
                currentFile: '/src/utils/helpers.js',
              },
            },
          ],
        },
      ],
    });
  });
});

/**
 * A self-import is the specifier resolving to THIS file, not two paths that
 * look alike once you cut their last dot off.
 *
 * These were the only two findings this rule produced on the pinned 8-repository
 * corpus, and both were wrong:
 *
 *   main.jsx            importing './main.css'                → both became `main`
 *   styleUtils.test.js  importing './styleUtils.test.constants'
 *                                                             → both became `styleUtils.test`
 *
 * A stylesheet is not this module, and `.constants` is not an extension at all —
 * it is part of the module's name. `\.[^/.]+$` cannot tell the difference, so
 * only a closed list of real module extensions is stripped now.
 */
describe('no-self-import — a suffix is not an extension', () => {
  ruleTester.run('extension handling', noSelfImport, {
    valid: [
      {
        // A stylesheet beside a component of the same stem.
        code: "import './main.css';",
        filename: '/repo/src/main.jsx',
      },
      {
        // `.constants` is a name segment, not an extension.
        code: 'import { A } from "./styleUtils.test.constants";',
        filename: '/repo/src/styleUtils.test.js',
      },
      {
        code: "import data from './config.json';",
        filename: '/repo/src/config.ts',
      },
      {
        // A sibling module that merely shares a prefix.
        code: "import { x } from './real.helpers';",
        filename: '/repo/src/real.ts',
      },
    ],
    invalid: [
      {
        // POSITIVE CONTROL: the extensionless self-import the rule exists for.
        // Without it every valid case above passes on a rule that never fires.
        code: "import { x } from './real';",
        filename: '/repo/src/real.ts',
        errors: [{ messageId: 'selfImport' }],
      },
      {
        // And with the extension spelled out.
        code: "import { x } from './real.ts';",
        filename: '/repo/src/real.ts',
        errors: [{ messageId: 'selfImport' }],
      },
    ],
  });

  /**
   * `allowInTests` used `filename.includes('__tests__')`, which matches any
   * path containing those characters anywhere. It suppresses rather than
   * reports, so it cost recall rather than trust — but it is still the
   * substring-on-a-name defect, and the devkit has the predicate.
   */
  ruleTester.run('allowInTests matches by segment', noSelfImport, {
    valid: [
      {
        code: "import { x } from './a';",
        filename: '/repo/src/__tests__/a.ts',
        options: [{ allowInTests: true }],
      },
      {
        code: "import { x } from './a';",
        filename: '/repo/src/a.test.ts',
        options: [{ allowInTests: true }],
      },
    ],
    invalid: [
      {
        // A directory whose NAME merely contains the characters is not a test
        // directory. This reported before only by luck of ordering.
        code: "import { x } from './a';",
        filename: '/repo/my__tests__project/src/a.ts',
        options: [{ allowInTests: true }],
        errors: [{ messageId: 'selfImport' }],
      },
      {
        // CONTROL: the option off restores the finding in a real test file.
        code: "import { x } from './a';",
        filename: '/repo/src/__tests__/a.ts',
        options: [{ allowInTests: false }],
        errors: [{ messageId: 'selfImport' }],
      },
    ],
  });
});
