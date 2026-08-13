/**
 * @fileoverview Tests for lock-file
 * 
 * NOTE: This rule checks for the lock file in the file system.
 * This repo uses npm, so package-lock.json exists at the root.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { lockFile } from './index';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

// Use a file path that is outside of this project repository to test invalid cases.
// This ensures the search (up to 10 levels) doesn't find the repo's pnpm-lock.yaml or accidental lock files in home.
// Each invalid case is its own project on disk. The rule reports a missing
// lock file once per project root, and only where a package.json exists — a
// directory with no manifest is not a JS project, so nothing is missing. A
// bare virtual path can no longer stand in for one.
function projectWithoutLockFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-file-fixture-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '1.0.0' }),
  );
  return path.join(dir, 'src', 'test.js');
}

/**
 * A project whose lock file sits more than ten directories above the linted
 * file — the ordinary shape of a monorepo package.
 *
 * Corpus: Shopify/cli `packages/app/src/cli/services/app-logs/logs-command/
 * ui/components/hooks/usePollAppLogs.ts:1`, reported as "lock file missing"
 * by a repo that commits `pnpm-lock.yaml` at its root. The ancestor walk gave
 * up after ten levels, so a deep-enough file could never see it.
 */
function deeplyNestedFileInLockedProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-file-deep-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'deep-fixture-root', version: '1.0.0' }),
  );
  fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  // The workspace package's own manifest, nine levels above the file. This is
  // load-bearing: it is what makes the old code REPORT rather than bail out.
  // With the manifest search also capped at ten levels, a fixture that omitted
  // it was suppressed by the "not a JS project" guard and passed on the broken
  // rule — proving nothing about the lock-file walk it was written to pin.
  const pkg = path.join(root, 'packages', 'app');
  fs.mkdirSync(pkg, { recursive: true });
  fs.writeFileSync(
    path.join(pkg, 'package.json'),
    JSON.stringify({ name: 'deep-fixture-app', version: '1.0.0' }),
  );
  // Eight more directories: the manifest stays inside ten levels, the lock
  // file at the repo root does not.
  const nested = path.join(pkg, ...Array.from({ length: 8 }, (_, i) => `d${i}`));
  fs.mkdirSync(nested, { recursive: true });
  return path.join(nested, 'deep.js');
}

ruleTester.run('lock-file', lockFile, {
  valid: [
    // Note: this rule inspects the file system for a lockfile near the
    // file under lint, so test cases need a real `filename` — the inert
    // shallow-test boilerplate cases (`const x = 42;` etc.) don't fit
    // here and were intentionally omitted.
    {
      code: "const validDefault = 1",
      filename: __filename,
    },
    {
      code: "const validNpm = 1",
      filename: __filename,
      options: [{ packageManager: 'npm' }]
    },
    // A lock file twelve directories up is still a lock file.
    {
      code: 'const deepMonorepoFile = 1',
      filename: deeplyNestedFileInLockedProject(),
      options: [{ packageManager: 'pnpm' }],
    },
  ],

  invalid: [
    {
      code: "const invalidPnpm = 1",
      filename: projectWithoutLockFile(),
      options: [{ packageManager: 'pnpm' }],
      errors: [{ 
        messageId: 'violationDetected',
        data: { packageManager: 'pnpm', lockFile: 'pnpm-lock.yaml' }
      }]
    },
    {
      code: "const invalidYarn = 1",
      filename: projectWithoutLockFile(),
      options: [{ packageManager: 'yarn' }],
      errors: [{ 
        messageId: 'violationDetected',
        data: { packageManager: 'yarn', lockFile: 'yarn.lock' }
      }]
    },
    {
      code: "const invalidOutside = 1",
      filename: projectWithoutLockFile(),
      options: [{ packageManager: 'npm' }],
      errors: [{ 
        messageId: 'violationDetected',
        data: { packageManager: 'npm', lockFile: 'package-lock.json' }
      }]
    }
  ],
});
