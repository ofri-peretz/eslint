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
          name: 'an allowed path',
          code: 'import utils from "../utils/helpers";',
        },
        // Import not matching restricted patterns
        {
          code: 'import api from "../services/api";',
          options: [
            {
              restricted: ['internal', 'private'],
            },
          ],
        },
      ],
      invalid: [
        // Import matching restricted pattern
        {
          name: 'an import into a path the configuration puts off limits',
          code: 'import internal from "../internal/api";',
          options: [
            {
              restricted: ['internal'],
            },
          ],
          errors: [
            {
              messageId: 'pathViolation',
            },
          ],
        },
        // Import matching another restricted pattern
        {
          code: 'import config from "../private/config";',
          options: [
            {
              restricted: ['private'],
            },
          ],
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
          options: [
            {
              restricted: ['internal'],
            },
          ],
        },
      ],
      invalid: [
        {
          code: 'const internal = require("../internal/api");',
          options: [
            {
              restricted: ['internal'],
            },
          ],
          errors: [
            {
              messageId: 'pathViolation',
            },
          ],
        },
      ],
    });
  });

  // Found by the fidelity model (benchmarks/suites/fidelity/models/import-next).
  describe('fidelity: whole path segments, every import spelling', () => {
    ruleTester.run('no-restricted-paths fidelity', noRestrictedPaths, {
      valid: [
        {
          name: 'observer is not the server path',
          code: "import o from './observer';",
          options: [{ restricted: ['server'] }],
        },
        {
          name: 'server-utils is not the server path',
          code: "import u from './server-utils';",
          options: [{ restricted: ['server'] }],
        },
        {
          name: 'a multi-segment pattern needs every segment in order',
          code: "import d from '../server/db';",
          options: [{ restricted: ['app/server'] }],
        },
      ],
      invalid: [
        {
          name: 'export * from a restricted path',
          code: "export * from '../server/db';",
          options: [{ restricted: ['server'] }],
          errors: [{ messageId: 'pathViolation' }],
        },
        {
          name: 'export { x } from a restricted path',
          code: "export { db } from '@/server/db';",
          options: [{ restricted: ['server'] }],
          errors: [{ messageId: 'pathViolation' }],
        },
        {
          name: 'a dynamic import of a restricted path',
          code: "const load = () => import('./app/server');",
          options: [{ restricted: ['app/server'] }],
          errors: [{ messageId: 'pathViolation' }],
        },
        {
          name: 'import x = require() of a restricted path',
          code: "import db = require('../server/db');",
          options: [{ restricted: ['server'] }],
          errors: [{ messageId: 'pathViolation' }],
        },
      ],
    });
  });
});

// Spellings that load no module, or load one the rule does not judge.
ruleTester.run(
  'no-restricted-paths fidelity (other spellings)',
  noRestrictedPaths,
  {
    valid: [
      {
        name: 'a pattern with no segments restricts nothing',
        code: "import s from './server';",
        options: [{ restricted: ['/'] }],
      },
      {
        name: 'a local export and a dynamic specifier load nothing the rule can name',
        code: 'namespace NS { export const b = 1; }\nimport A = NS.b;\nexport const v = A;\nexport { A };\nconst load = (p: string) => import(p);',
        options: [{ restricted: ['server'] }],
      },
    ],
    invalid: [],
  },
);
