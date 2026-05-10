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
            enum: ['npm', 'yarn', 'pnpm'],
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

    // Check once per file
    let checked = false;
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
        if (checked) return;
        checked = true;

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
