/**
 * Tests for no-self-import rule
 * Forbid a module from importing itself
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSelfImport } from '../rules/architecture/no-self-import';

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
                reason: 'A module cannot import itself, which would create a circular dependency',
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
                reason: 'A module cannot import itself, which would create a circular dependency',
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
                reason: 'A module cannot require itself, which would create a circular dependency',
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
