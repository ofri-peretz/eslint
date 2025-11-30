/**
 * Tests for no-relative-parent-imports rule
 * Prevents ../ imports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRelativeParentImports } from '../rules/architecture/no-relative-parent-imports';

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

describe('no-relative-parent-imports', () => {
  describe('Basic functionality', () => {
    ruleTester.run('forbid relative parent imports', noRelativeParentImports, {
      valid: [
        // Same level or child imports are allowed
        {
          code: 'import helper from "./helper";',
        },
        {
          code: 'import utils from "./utils/index";',
        },
        {
          code: 'import lodash from "lodash";',
        },
        // No imports
        {
          code: 'console.log("hello");',
        },
      ],
      invalid: [
        // Parent directory imports should be flagged
        {
          code: 'import config from "../config";',
          errors: [
            {
              messageId: 'preferAbsoluteImport',
            },
          ],
        },
        {
          code: 'import utils from "../utils";',
          errors: [
            {
              messageId: 'preferAbsoluteImport',
            },
          ],
        },
        // Multiple levels up
        {
          code: 'import config from "../../config";',
          errors: [
            {
              messageId: 'preferAbsoluteImport',
            },
          ],
        },
        // Deep parent imports
        {
          code: 'import { helper } from "../../../helpers";',
          errors: [
            {
              messageId: 'preferAbsoluteImport',
            },
          ],
        },
      ],
    });
  });

  describe('CommonJS require() calls', () => {
    ruleTester.run('handle require() calls', noRelativeParentImports, {
      valid: [
        {
          code: 'const helper = require("./helper");',
        },
      ],
      invalid: [
        {
          code: 'const utils = require("../utils");',
          errors: [
            {
              messageId: 'preferAbsoluteImport',
            },
          ],
        },
      ],
    });
  });
});
