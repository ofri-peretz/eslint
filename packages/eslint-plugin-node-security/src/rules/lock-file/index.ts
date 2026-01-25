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
      description: 'Ensure package lock file exists for the configured package manager',
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
  defaultOptions: [{ packageManager: 'npm' }],
  create(context) {
    const fs = require('node:fs');
    const path = require('node:path');
    
    // Check once per file
    let checked = false;
    const options = context.options[0] || {};
    const packageManager = options.packageManager || 'npm';

    const lockFiles: Record<string, string> = {
      npm: 'package-lock.json',
      yarn: 'yarn.lock',
      pnpm: 'pnpm-lock.yaml',
    };

    const targetLockFile = lockFiles[packageManager];
    
    return {
      Program(node: TSESTree.Program) {
        if (checked) return;
        checked = true;
        
        // Find project root (simplified)
        let dir = path.dirname(context.filename);
        let found = false;
        
        // Search up to 10 levels for the lock file
        for (let i = 0; i < 10; i++) {
          const lockPath = path.join(dir, targetLockFile);
          if (fs.existsSync(lockPath)) {
            found = true;
            break;
          }
          const parentDir = path.dirname(dir);
          if (parentDir === dir) break;
          dir = parentDir;
        }
        
        if (!found) {
          context.report({ 
            node, 
            messageId: 'violationDetected',
            data: {
              packageManager,
              lockFile: targetLockFile,
            }
          });
        }
      },
    };
  },
});
