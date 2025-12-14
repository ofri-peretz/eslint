/**
 * @fileoverview Detect potential typosquatting in dependencies
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/506.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const detectSuspiciousDependencies = createRule<RuleOptions, MessageIds>({
  name: 'detect-suspicious-dependencies',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect typosquatting in package names',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Suspicious Dependency',
        cwe: 'CWE-506',
        description: 'Suspicious package name detected - possible typosquatting',
        severity: 'HIGH',
        fix: 'Verify package authenticity on npm registry',
        documentationLink: 'https://cwe.mitre.org/data/definitions/506.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const popularPackages = ['react', 'lodash', 'express', 'axios', 'webpack'];
    
    function levenshtein(a: string, b: string): number {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    }
    
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const source = node.source.value;
        if (typeof source === 'string' && !source.startsWith('.') && !source.startsWith('@')) {
          for (const popular of popularPackages) {
            const distance = levenshtein(source, popular);
            if (distance > 0 && distance <= 2) {
              context.report({
                node,
                messageId: 'violationDetected',
                data: { name: source, similar: popular },
              });
            }
          }
        }
      },
    };
  },
});

