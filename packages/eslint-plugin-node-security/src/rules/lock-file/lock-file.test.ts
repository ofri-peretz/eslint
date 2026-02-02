/**
 * @fileoverview Tests for lock-file
 * 
 * NOTE: This rule checks for the lock file in the file system.
 * This repo uses npm, so package-lock.json exists at the root.
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
    { 
      code: "const validDefault = 1", 
      filename: __filename,
    },
    { 
      code: "const validNpm = 1", 
      filename: __filename,
      options: [{ packageManager: 'npm' }]
    },
  ],

  invalid: [
    {
      code: "const invalidPnpm = 1",
      filename: virtualFileOutsideRepo,
      options: [{ packageManager: 'pnpm' }],
      errors: [{ 
        messageId: 'violationDetected',
        data: { packageManager: 'pnpm', lockFile: 'pnpm-lock.yaml' }
      }]
    },
    {
      code: "const invalidYarn = 1",
      filename: virtualFileOutsideRepo,
      options: [{ packageManager: 'yarn' }],
      errors: [{ 
        messageId: 'violationDetected',
        data: { packageManager: 'yarn', lockFile: 'yarn.lock' }
      }]
    },
    {
      code: "const invalidOutside = 1",
      filename: virtualFileOutsideRepo,
      options: [{ packageManager: 'npm' }],
      errors: [{ 
        messageId: 'violationDetected',
        data: { packageManager: 'npm', lockFile: 'package-lock.json' }
      }]
    }
  ],
});
