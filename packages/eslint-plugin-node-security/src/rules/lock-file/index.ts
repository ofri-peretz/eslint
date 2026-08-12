/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Ensure package lock file exists
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/829.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

export interface Options {
  packageManager?: 'npm' | 'yarn' | 'pnpm';
}

type RuleOptions = [Options?];

/**
 * Project roots already reported in this process, so the finding is emitted
 * once per project rather than once per file. Module scope is deliberate:
 * ESLint builds a fresh rule context for every file, so state inside
 * `create()` cannot deduplicate across them — which is exactly how the
 * original per-file guard failed.
 */
const reportedRoots = new Set<string>();

export const lockFile = createRule<RuleOptions, MessageIds>({
  name: 'lock-file',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/lock-file.md',
      description: 'Ensure package lock file exists for the configured package manager',
      cwe: 'CWE-829',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Lock File Missing',
        cwe: 'CWE-829',
        description: 'Package lock file missing ({{ lockFile }}) for {{ packageManager }}. Commit the lock file to ensure supply chain integrity.',
        severity: 'HIGH',
        fix: 'Generate and commit the {{ lockFile }} file.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/829.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          packageManager: {
            type: 'string',
            enum: ['npm', 'yarn', 'pnpm'], description: 'Package manager whose lock file is required'
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const fs = require('node:fs');
    const path = require('node:path');

    const options = context.options[0] || {};
    const userPackageManager = options.packageManager;

    const lockFiles: Record<string, string> = {
      npm: 'package-lock.json',
      yarn: 'yarn.lock',
      pnpm: 'pnpm-lock.yaml',
    };

    // When no packageManager is configured, accept ANY of the three common
    // lock files. Otherwise look only for the configured one. This avoids
    // firing on every file in a pnpm/yarn monorepo just because the rule
    // defaulted to looking for package-lock.json.
    const targetLockFiles = userPackageManager
      ? [lockFiles[userPackageManager]]
      : Object.values(lockFiles);
    const targetLockFile = userPackageManager
      ? lockFiles[userPackageManager]
      : 'package-lock.json | yarn.lock | pnpm-lock.yaml';
    const reportedManager = userPackageManager ?? 'any';

    return {
      Program(node: TSESTree.Program) {
        // Find project root (simplified)
        let dir = path.dirname(context.filename);
        let found = false;

        // Search up to 10 levels for any acceptable lock file
        for (let i = 0; i < 10; i++) {
          for (const lf of targetLockFiles) {
            if (fs.existsSync(path.join(dir, lf))) {
              found = true;
              break;
            }
          }
          if (found) break;
          const parentDir = path.dirname(dir);
          if (parentDir === dir) break;
          dir = parentDir;
        }

        if (!found) {
          // A missing lock file is one fact about the project. The guard that
          // used to sit at the top of this visitor was `let checked = false`
          // inside create(), which ESLint calls per file — so it reset every
          // time and reported once per source file. auth0/express-openid-connect
          // produced 135 identical findings, at arbitrary lines.
          //
          // The project is where package.json lives. `dir` cannot serve as the
          // key: when the search fails it has walked to the filesystem root,
          // collapsing every project onto one entry.
          let root = path.dirname(context.filename);
          let manifest = false;
          for (let i = 0; i < 10; i++) {
            if (fs.existsSync(path.join(root, 'package.json'))) {
              manifest = true;
              break;
            }
            const parent = path.dirname(root);
            if (parent === root) break;
            root = parent;
          }
          // No manifest anywhere above the file: not a JS project, so there is
          // no lock file to be missing.
          if (!manifest) return;
          if (reportedRoots.has(root)) return;
          reportedRoots.add(root);

          context.report({
            node,
            messageId: 'violationDetected',
            data: {
              packageManager: reportedManager,
              lockFile: targetLockFile,
            }
          });
        }
      },
    };
  },
});
