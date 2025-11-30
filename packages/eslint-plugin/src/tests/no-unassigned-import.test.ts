/**
 * Tests for no-unassigned-import rule
 * Prevents unassigned imports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnassignedImport } from '../rules/architecture/no-unassigned-import';

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

describe('no-unassigned-import', () => {
  describe('Basic functionality', () => {
    ruleTester.run('forbid unassigned imports', noUnassignedImport, {
      valid: [
        // Assigned imports are allowed
        {
          code: 'import helper from "./helper";',
        },
        {
          code: 'import { Component } from "react";',
        },
        {
          code: 'import * as utils from "./utils";',
        },
        {
          code: 'import type { User } from "./types";',
        },
        // No imports
        {
          code: 'console.log("hello");',
        },
        // Allowed modules
        {
          code: 'import "polyfill";',
          options: [{
            allowModules: ['polyfill']
          }],
        },
      ],
      invalid: [
        // Unassigned imports should be flagged
        {
          code: 'import "./polyfill";',
          errors: [
            {
              messageId: 'unassignedImport',
            },
          ],
        },
        {
          code: 'import "setup";',
          errors: [
            {
              messageId: 'unassignedImport',
            },
          ],
        },
      ],
    });
  });

  describe('CommonJS require() calls', () => {
    ruleTester.run('handle require() calls', noUnassignedImport, {
      valid: [
        {
          code: 'const helper = require("./helper");',
        },
      ],
      invalid: [
        {
          code: 'require("./polyfill");',
          errors: [
            {
              messageId: 'unassignedImport',
            },
          ],
        },
      ],
    });
  });
});
