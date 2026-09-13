/**
 * Tests for no-relative-parent-imports rule
 * Prevents ../ imports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRelativeParentImports } from '../rules/no-relative-parent-imports';

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
          name: 'a sibling import',
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
          name: 'an import that climbs out of its own directory',
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

  describe('Dynamic import() expressions', () => {
    ruleTester.run('handle dynamic imports', noRelativeParentImports, {
      valid: [
        {
          name: 'a dynamic sibling import',
          code: 'const helper = () => import("./helper.js");',
        },
        {
          name: 'a dynamic bare-specifier import',
          code: 'const lodash = () => import("lodash");',
        },
        {
          name: 'a computed specifier that cannot be read statically',
          code: 'const load = (name) => import(name);',
        },
      ],
      invalid: [
        // burgee packages/burgee/src/commander/command.ts:1700 — lazily loaded
        // completions module; the static ../ imports at :22-26 are reported and
        // this one, the same climb out of the directory, was not.
        {
          name: 'a dynamic import that climbs out of its own directory',
          code: 'const load = () => import("../completions.js");',
          errors: [
            {
              messageId: 'preferAbsoluteImport',
            },
          ],
        },
        // burgee packages/burgee/src/yargs/factory.ts:1416
        {
          name: 'a dynamic import awaited inside a function',
          code: 'async function load() { return await import("../../helpers.js"); }',
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
