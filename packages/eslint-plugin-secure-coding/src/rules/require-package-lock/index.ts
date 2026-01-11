/**
 * @fileoverview Ensure package lock file exists
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/829.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requirePackageLock = createRule<RuleOptions, MessageIds>({
  name: 'require-package-lock',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure package-lock.json or yarn.lock exists',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-829',
        description: 'Package lock file missing - commit package-lock',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/829.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const fs = require('node:fs');
    const path = require('node:path');
    
    // Check once per file
    let checked = false;
    
    return {
      Program(node: TSESTree.Program) {
        if (checked) return;
        checked = true;
        
        // Find project root (simplified)
        let dir = path.dirname(context.filename);
        let found = false;
        
        for (let i = 0; i < 10; i++) {
          if (fs.existsSync(path.join(dir, 'package-lock.json')) ||
              fs.existsSync(path.join(dir, 'yarn.lock')) ||
              fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) {
            found = true;
            break;
          }
          dir = path.dirname(dir);
        }
        
        if (!found) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});

