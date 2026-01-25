/**
 * @fileoverview Tests for lock-file
 * 
 * NOTE: This rule checks for the lock file in the file system.
 * This repo uses pnpm, so pnpm-lock.yaml exists at the root.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { lockFile } from './index';
import * as path from 'node:path';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

// Use a file path that is outside of this project repository to test invalid cases.
// This ensures the search (up to 10 levels) doesn't find the repo's pnpm-lock.yaml or accidental lock files in home.
const virtualFileOutsideRepo = path.join(path.parse(process.cwd()).root, 'non-existent-project', 'src', 'test.js');

ruleTester.run('lock-file', lockFile, {
  valid: [
    // pnpm-lock.yaml exists in the current repo root, so this should pass when configured for pnpm.
    // We use __filename to ensure it finds the real pnpm-lock.yaml.
    { 
      code: "const x = 1", 
      filename: __filename, // This is inside /Users/ofri/.../eslint/...
      options: [{ packageManager: 'pnpm' }]
    },
  ],

  invalid: [
    // Default package manager is npm, should fail since package-lock.json is missing in this pnpm repo
    // Note: We use the virtual file outside repo to avoid finding accidental lock files in parent dirs
    {
      code: "const x = 1",
      filename: virtualFileOutsideRepo,
      options: [],
      errors: [{ 
        messageId: 'violationDetected',
        data: { packageManager: 'npm', lockFile: 'package-lock.json' }
      }]
    },
    // Explicit npm configuration
    {
      code: "const x = 1",
      filename: virtualFileOutsideRepo,
      options: [{ packageManager: 'npm' }],
      errors: [{ 
        messageId: 'violationDetected',
        data: { packageManager: 'npm', lockFile: 'package-lock.json' }
      }]
    },
    // Explicit yarn configuration
    {
      code: "const x = 1",
      filename: virtualFileOutsideRepo,
      options: [{ packageManager: 'yarn' }],
      errors: [{ 
        messageId: 'violationDetected',
        data: { packageManager: 'yarn', lockFile: 'yarn.lock' }
      }]
    }
  ],
});
