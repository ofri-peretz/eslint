/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/detect-suspicious-dependencies.md',
      description: 'Detect typosquatting in package names',
      cwe: 'CWE-506',
      cvss: 7.5,
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

    /**
     * Real packages that happen to sit close to a popular name.
     *
     * Edit distance alone cannot tell a typosquat from a package that simply
     * has a similar name. `preact` is one character from `react` and is a
     * legitimate dependency of okta/okta-signin-widget, where this rule
     * reported it as a possible attack; `recast` is two from `react` and is
     * the AST library jscodeshift is built on.
     *
     * Accusing a real dependency of being malware is far more costly than
     * missing a squat, so a name has to clear this list before it is reported.
     */
    const KNOWN_LEGITIMATE = new Set([
      'preact', 'recast', 'react-dom', 'reactor', 'redux',
      'lodash-es', 'expressive', 'axios-retry', 'webpack-cli',
    ]);
    
    // oxlint-disable-next-line consistent-function-scoping
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
            // Damerau: a transposition is a single slip of the fingers, not
            // two edits. Without this, `raect` scores 2 against `react` and a
            // threshold of 1 would miss the most common squat shape there is.
            if (
              i > 1 &&
              j > 1 &&
              b.charAt(i - 1) === a.charAt(j - 2) &&
              b.charAt(i - 2) === a.charAt(j - 1)
            ) {
              matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
            }
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
            // Distance 2 sweeps in too much genuine code — `recast` is two
            // edits from `react`. A real typosquat is a single slip:
            // transposition, doubling, or one wrong key.
            if (distance === 1 && !KNOWN_LEGITIMATE.has(source)) {
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

