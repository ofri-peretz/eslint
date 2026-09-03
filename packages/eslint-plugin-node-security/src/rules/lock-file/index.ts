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
  /**
   * Package manager whose lock file is required. Default: `'any'`, which
   * accepts whichever of the three is present. Omitting the option and writing
   * `'any'` are the same thing.
   */
  packageManager?: 'any' | 'npm' | 'yarn' | 'pnpm';
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
            // `'any'` is a real value here, not filler. The behaviour it names
            // — accept whichever of the three lock files is present — was
            // already the default, but it was reachable only by OMITTING the
            // option, so it could not be spelled and the schema could not
            // declare a default. Naming it makes the default expressible and
            // lets a config say "any" out loud; `undefined` still maps to it.
            enum: ['any', 'npm', 'yarn', 'pnpm'],
            default: 'any',
            description:
              'Package manager whose lock file is required. `any` accepts package-lock.json, yarn.lock or pnpm-lock.yaml — the right setting for a repo that has not standardised.',
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
    // Omitting the option and writing `'any'` mean the same thing, so the
    // schema's `default: 'any'` and this line agree by construction.
    const packageManager: string = options.packageManager ?? 'any';

    const lockFiles: Record<string, string> = {
      npm: 'package-lock.json',
      yarn: 'yarn.lock',
      pnpm: 'pnpm-lock.yaml',
    };

    // Under `any`, accept ANY of the three common lock files; otherwise look
    // only for the configured one. This avoids firing on every file in a
    // pnpm/yarn monorepo just because the rule defaulted to package-lock.json.
    const specific = packageManager !== 'any';
    const targetLockFiles = specific
      ? [lockFiles[packageManager]]
      : Object.values(lockFiles);
    const targetLockFile = specific
      ? lockFiles[packageManager]
      : 'package-lock.json | yarn.lock | pnpm-lock.yaml';
    const reportedManager = packageManager;

    /**
     * The nearest ancestor directory containing any of `names`.
     *
     * Walks to the filesystem root. The previous version stopped after ten
     * levels, which silently manufactured findings in monorepos: Shopify/cli
     * `packages/app/src/cli/services/app-logs/logs-command/ui/components/hooks/
     * usePollAppLogs.ts` sits eleven directories below the repo root, so the
     * walk ran out before reaching the `pnpm-lock.yaml` that is right there.
     * The rule reported "lock file missing" about a repo that commits one.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const findUpward = (from: string, names: readonly string[]): string | undefined => {
      let dir = from;
      for (;;) {
        for (const name of names) {
          if (fs.existsSync(path.join(dir, name))) return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) return undefined;
        dir = parent;
      }
    };

    return {
      Program(node: TSESTree.Program) {
        const found = findUpward(path.dirname(context.filename), targetLockFiles) !== undefined;

        if (!found) {
          // A missing lock file is one fact about the project. The guard that
          // used to sit at the top of this visitor was `let checked = false`
          // inside create(), which ESLint calls per file — so it reset every
          // time and reported once per source file. auth0/express-openid-connect
          // produced 135 identical findings, at arbitrary lines.
          //
          // The project is where package.json lives. The lock-file search
          // result cannot serve as the key: when it fails it has walked to the
          // filesystem root, collapsing every project onto one entry.
          //
          // No manifest anywhere above the file: not a JS project, so there is
          // no lock file to be missing.
          const root = findUpward(path.dirname(context.filename), ['package.json']);
          if (root === undefined) return;
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
