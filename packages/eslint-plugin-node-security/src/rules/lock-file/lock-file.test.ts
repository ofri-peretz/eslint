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
  const nested = path.join(
    pkg,
    ...Array.from({ length: 8 }, (_, i) => `d${i}`),
  );
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
      name: 'the expected lock file',
      code: 'const validDefault = 1',
      filename: __filename,
    },
    {
      name: 'a project with package-lock.json passes when packageManager is npm',
      code: 'const validNpm = 1',
      filename: __filename,
      options: [{ packageManager: 'npm' }],
    },
    // A lock file twelve directories up is still a lock file.
    {
      name: 'a monorepo file eleven levels below the root pnpm-lock.yaml still finds it',
      code: 'const deepMonorepoFile = 1',
      filename: deeplyNestedFileInLockedProject(),
      options: [{ packageManager: 'pnpm' }],
    },
    // `'any'` spelled out. This repo commits package-lock.json, so the `any`
    // arm has to accept it — the same result as omitting the option, which is
    // exactly the equivalence the schema's `default: 'any'` now claims.
    {
      name: "spelling out 'any' accepts the package-lock.json this repository commits",
      code: 'const validAny = 1',
      filename: __filename,
      options: [{ packageManager: 'any' }],
    },
    // `any` also accepts a pnpm-only project — proof the arm really searches
    // all three names rather than falling back to package-lock.json.
    {
      name: "'any' accepts a pnpm-only project, so it searches all three names",
      code: 'const anyAcceptsPnpm = 1',
      filename: deeplyNestedFileInLockedProject(),
      options: [{ packageManager: 'any' }],
    },
  ],

  invalid: [
    {
      name: 'a lock file for a package manager the project does not use',
      code: 'const invalidPnpm = 1',
      filename: projectWithoutLockFile(),
      options: [{ packageManager: 'pnpm' }],
      errors: [
        {
          messageId: 'violationDetected',
          data: { packageManager: 'pnpm', lockFile: 'pnpm-lock.yaml' },
        },
      ],
    },
    {
      name: 'a project without yarn.lock is reported when packageManager is yarn',
      code: 'const invalidYarn = 1',
      filename: projectWithoutLockFile(),
      options: [{ packageManager: 'yarn' }],
      errors: [
        {
          messageId: 'violationDetected',
          data: { packageManager: 'yarn', lockFile: 'yarn.lock' },
        },
      ],
    },
    {
      code: 'const invalidOutside = 1',
      filename: projectWithoutLockFile(),
      options: [{ packageManager: 'npm' }],
      errors: [
        {
          messageId: 'violationDetected',
          data: { packageManager: 'npm', lockFile: 'package-lock.json' },
        },
      ],
    },
    // The DEFAULT path, previously untested: no option at all. It must report
    // `any` and list all three candidate names, which is what the schema's
    // `default: 'any'` promises a reader.
    {
      code: 'const invalidNoOption = 1',
      filename: projectWithoutLockFile(),
      errors: [
        {
          messageId: 'violationDetected',
          data: {
            packageManager: 'any',
            lockFile: 'package-lock.json | yarn.lock | pnpm-lock.yaml',
          },
        },
      ],
    },
    // …and spelling `'any'` explicitly must be indistinguishable from omitting
    // it. If these two ever diverge, the documented default is a lie.
    {
      code: 'const invalidExplicitAny = 1',
      filename: projectWithoutLockFile(),
      options: [{ packageManager: 'any' }],
      errors: [
        {
          messageId: 'violationDetected',
          data: {
            packageManager: 'any',
            lockFile: 'package-lock.json | yarn.lock | pnpm-lock.yaml',
          },
        },
      ],
    },
  ],
});

/**
 * A git repository with no lock file, nested inside a directory that has one —
 * the shape of a checkout under a home directory holding a stray
 * `~/pnpm-lock.yaml`. The outer lock file is not part of the repository, so it
 * pins none of the repository's installs.
 */
function repoBelowAStrayLockFile(gitAs: 'dir' | 'file'): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-file-home-'));
  fs.writeFileSync(path.join(home, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  const repo = path.join(home, 'repo');
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  if (gitAs === 'dir') fs.mkdirSync(path.join(repo, '.git'));
  else fs.writeFileSync(path.join(repo, '.git'), 'gitdir: ../elsewhere/.git\n');
  fs.writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'repo-fixture', version: '1.0.0' }),
  );
  return path.join(repo, 'src', 'index.js');
}

/** The same layout, with the lock file committed at the repository root. */
function repoWithItsOwnLockFile(): string {
  const file = repoBelowAStrayLockFile('dir');
  const repo = path.dirname(path.dirname(file));
  fs.writeFileSync(path.join(repo, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  return file;
}

ruleTester.run('lock-file: the search stops at the repository root', lockFile, {
  valid: [
    {
      name: 'a lock file at the repository root (where .git is) is found',
      code: 'const repoRootLock = 1',
      filename: repoWithItsOwnLockFile(),
      options: [{ packageManager: 'pnpm' }],
    },
  ],
  invalid: [
    {
      name: 'a stray lock file above the repository root does not count',
      code: 'const strayHomeLock = 1',
      filename: repoBelowAStrayLockFile('dir'),
      options: [{ packageManager: 'pnpm' }],
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a .git FILE (worktree, submodule) marks the repository root too',
      code: 'const strayHomeLockWorktree = 1',
      filename: repoBelowAStrayLockFile('file'),
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/**
 * A project whose manifest is `manifest` (written verbatim when a string) and
 * that commits no lock file.
 */
function projectWithManifest(manifest: object | string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-file-manifest-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    typeof manifest === 'string' ? manifest : JSON.stringify(manifest),
  );
  return path.join(dir, 'src', 'index.js');
}

ruleTester.run('lock-file: published libraries commit no lock file', lockFile, {
  valid: [
    {
      // @source expressjs/express index.js:9 (package.json declares `files`)
      // @found real-source scan of the expressjs/* packages, 2026-11-24
      name: 'a published package declaring `files` (express) is not reported',
      code: 'const expressShape = 1',
      filename: projectWithManifest({ name: 'express', version: '5.1.0', files: ['index.js', 'lib/'] }),
    },
    {
      // @source expressjs/body-parser index.js:7 (package.json declares `exports`)
      // @found real-source scan of the expressjs/* packages, 2026-11-24
      name: 'a published package declaring `exports` (body-parser) is not reported',
      code: 'const bodyParserShape = 1',
      filename: projectWithManifest({ name: 'body-parser', version: '2.2.0', exports: './index.js' }),
    },
    {
      // @source expressjs/cors lib/index.js:1 (package.json declares `main`)
      // @found real-source scan of the expressjs/* packages, 2026-11-24
      name: 'a published package declaring `main` (cors) is not reported',
      code: 'const corsShape = 1',
      filename: projectWithManifest({ name: 'cors', version: '2.8.5', main: './lib/index.js' }),
    },
  ],
  invalid: [
    {
      name: 'a private package still needs its lock file, whatever it declares',
      code: 'const privateWithEntry = 1',
      filename: projectWithManifest({ name: 'app', private: true, main: 'index.js', files: ['dist'] }),
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'an app manifest with no entry point or files list is still reported',
      code: 'const appShape = 1',
      filename: projectWithManifest({ name: 'app', version: '1.0.0', scripts: { start: 'node .' } }),
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a manifest that is not valid JSON does not exempt the project',
      code: 'const brokenManifest = 1',
      filename: projectWithManifest('{ "name": "broken", "main": '),
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a manifest that parses to null does not exempt the project',
      code: 'const nullManifest = 1',
      filename: projectWithManifest('null'),
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
