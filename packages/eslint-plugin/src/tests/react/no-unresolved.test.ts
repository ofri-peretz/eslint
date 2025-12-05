/**
 * Comprehensive tests for no-unresolved rule
 * Ensures imports point to resolvable modules
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnresolved } from '../../rules/architecture/no-unresolved';

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

describe('no-unresolved', () => {
  describe('Basic module resolution', () => {
    ruleTester.run('detect unresolvable imports', noUnresolved, {
      valid: [
        // Valid imports (these would resolve in a real project)
        {
          code: 'import fs from "fs";',
          filename: '/test/file.js',
          options: [{ allowUnresolved: true }], // Allow for testing
        },
        {
          code: 'import path from "path";',
          filename: '/test/file.js',
          options: [{ allowUnresolved: true }],
        },
        // Relative imports that would exist
        {
          code: 'import helper from "./helper";',
          filename: '/test/file.js',
          options: [{ allowUnresolved: true }],
        },
        // Type-only imports
        {
          code: 'import type { User } from "./types";',
          filename: '/test/file.js',
          options: [{ allowUnresolved: true }],
        },
      ],
      invalid: [
        // Invalid imports that cannot resolve
        {
          code: 'import nonexistent from "./nonexistent-module";',
          filename: '/test/file.js',
          options: [{ allowUnresolved: false }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nimport nonexistent from "./nonexistent-module";',
            }],
          }],
        },
        {
          code: 'import { foo } from "nonexistent-package";',
          filename: '/test/file.js',
          options: [{ allowUnresolved: false }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nimport { foo } from "nonexistent-package";',
            }],
          }],
        },
        // Invalid relative paths
        {
          code: 'import data from "../../../nonexistent";',
          filename: '/test/file.js',
          options: [{ allowUnresolved: false }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nimport data from "../../../nonexistent";',
            }],
          }],
        },
      ],
    });
  });

  describe('CommonJS require() calls', () => {
    ruleTester.run('handle require() calls', noUnresolved, {
      valid: [
        {
          code: 'const fs = require("fs");',
          filename: '/test/file.js',
          options: [{ allowUnresolved: true }],
        },
        {
          code: 'const path = require("path");',
          filename: '/test/file.js',
          options: [{ allowUnresolved: true }],
        },
      ],
      invalid: [
        {
          code: 'const nonexistent = require("./nonexistent");',
          filename: '/test/file.js',
          options: [{ allowUnresolved: false }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nconst nonexistent = require("./nonexistent");',
            }],
          }],
        },
        {
          code: 'const pkg = require("nonexistent-package");',
          filename: '/test/file.js',
          options: [{ allowUnresolved: false }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nconst pkg = require("nonexistent-package");',
            }],
          }],
        },
      ],
    });
  });

  describe('Dynamic imports', () => {
    ruleTester.run('handle dynamic imports', noUnresolved, {
      valid: [
        {
          code: 'const module = import("fs");',
          filename: '/test/file.js',
          options: [{ allowUnresolved: true }],
        },
      ],
      invalid: [
        {
          code: 'const module = import("./nonexistent");',
          filename: '/test/file.js',
          options: [{ allowUnresolved: false }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nconst module = import("./nonexistent");',
            }],
          }],
        },
      ],
    });
  });

  describe('TypeScript imports', () => {
    ruleTester.run('handle TypeScript import syntax', noUnresolved, {
      valid: [
        {
          code: 'import type { User } from "./types";',
          filename: '/test/file.ts',
          options: [{ allowUnresolved: true }],
        },
        {
          code: 'import { Component } from "react";',
          filename: '/test/file.tsx',
          options: [{ allowUnresolved: true }],
        },
      ],
      invalid: [
        {
          code: 'import type { Nonexistent } from "./nonexistent-types";',
          filename: '/test/file.ts',
          options: [{ allowUnresolved: false }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nimport type { Nonexistent } from "./nonexistent-types";',
            }],
          }],
        },
      ],
    });
  });

  describe('Configuration options', () => {
    ruleTester.run('respect ignore patterns', noUnresolved, {
      valid: [
        {
          code: 'import ignored from "ignored-module";',
          filename: '/test/file.js',
          options: [{
            ignore: ['ignored-module'],
            allowUnresolved: false
          }],
        },
        {
          code: 'import another from "./ignored";',
          filename: '/test/file.js',
          options: [{
            ignore: ['**/ignored'],
            allowUnresolved: false
          }],
        },
      ],
      invalid: [
        {
          code: 'import notIgnored from "not-ignored-module";',
          filename: '/test/file.js',
          options: [{
            ignore: ['ignored-module'],
            allowUnresolved: false
          }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nimport notIgnored from "not-ignored-module";',
            }],
          }],
        },
      ],
    });

    ruleTester.run('respect file extensions', noUnresolved, {
      valid: [
        {
          code: 'import config from "./config.json";',
          filename: '/test/file.js',
          options: [{
            extensions: ['.js', '.json'],
            allowUnresolved: true
          }],
        },
      ],
      invalid: [
        {
          code: 'import config from "./config.yaml";',
          filename: '/test/file.js',
          options: [{
            extensions: ['.js', '.json'],
            allowUnresolved: false
          }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nimport config from "./config.yaml";',
            }],
          }],
        },
      ],
    });
  });

  describe('Error messages', () => {
    ruleTester.run('provide helpful error messages', noUnresolved, {
      valid: [],
      invalid: [
        {
          code: 'import nonexistent from "./missing-file";',
          filename: '/test/file.js',
          options: [{ allowUnresolved: false }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nimport nonexistent from "./missing-file";',
            }],
          }],
        },
        {
          code: 'const lib = require("unknown-lib");',
          filename: '/test/file.js',
          options: [{ allowUnresolved: false }],
          errors: [{
            messageId: 'moduleNotFound',
            suggestions: [{
              messageId: 'addIgnoreComment',
              output: '// eslint-disable-next-line @forge-js/llm-optimized/no-unresolved\nconst lib = require("unknown-lib");',
            }],
          }],
        },
      ],
    });
  });
});
