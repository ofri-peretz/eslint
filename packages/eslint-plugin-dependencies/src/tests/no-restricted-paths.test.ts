/**
 * Tests for no-restricted-paths rule
 * Prevents imports from restricted paths
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRestrictedPaths } from '../rules/no-restricted-paths';

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

describe('no-restricted-paths', () => {
  describe('Basic functionality', () => {
    ruleTester.run('forbid restricted paths', noRestrictedPaths, {
      valid: [
        // No restricted patterns configured
        {
          code: 'import utils from "../utils/helpers";',
        },
        // Import not matching restricted patterns
        {
          code: 'import api from "../services/api";',
          options: [{
            restricted: ['internal', 'private']
          }],
        },
      ],
      invalid: [
        // Import matching restricted pattern
        {
          code: 'import internal from "../internal/api";',
          options: [{
            restricted: ['internal']
          }],
          errors: [
            {
              messageId: 'pathViolation',
            },
          ],
        },
        // Import matching another restricted pattern
        {
          code: 'import config from "../private/config";',
          options: [{
            restricted: ['private']
          }],
          errors: [
            {
              messageId: 'pathViolation',
            },
          ],
        },
      ],
    });
  });

  describe('CommonJS require() calls', () => {
    ruleTester.run('handle require() calls', noRestrictedPaths, {
      valid: [
        {
          code: 'const helper = require("./helper");',
          options: [{
            restricted: ['internal']
          }],
        },
      ],
      invalid: [
        {
          code: 'const internal = require("../internal/api");',
          options: [{
            restricted: ['internal']
          }],
          errors: [
            {
              messageId: 'pathViolation',
            },
          ],
        },
      ],
    });
  });
});
