/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect debug code in production
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/489.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import { isNonProductionPath } from '../../lib/non-production-paths';

type MessageIds = 'violationDetected';

export interface Options {
  /**
   * Skip directories that never ship — `scripts/`, `bin/`, `tools/`, `env/`,
   * `benchmarks/`, examples and demos — plus top-level build config
   * (`*.config.js`, `Gruntfile`). Default: true.
   *
   * The name of this rule is the argument for the option: a build script is
   * not production, so debug output in one is not debug code left in
   * production. Shares `NON_PRODUCTION_SEGMENTS` with `no-console-log`, which
   * reports many of the SAME lines under a different framing — okta-auth-js
   * `env/index.js:22` and `scripts/verify-package.js` were counted by both.
   */
  ignoreNonProductionPaths?: boolean;
}

type RuleOptions = [Options?];

export const noDebugCodeInProduction = createRule<RuleOptions, MessageIds>({
  name: 'no-debug-code-in-production',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-operability/docs/rules/no-debug-code-in-production.md',
      description: 'Detect debug code in production',
      cwe: 'CWE-489',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-489',
        description:
          'Detect debug code in production detected - DEBUG, __DEV__, console',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/489.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreNonProductionPaths: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ ignoreNonProductionPaths: true }],
  create(context, [options = {}]) {
    // No `?? {}` here: the parameter default already covers undefined, and the
    // fallback would be a branch no input can take.
    const { ignoreNonProductionPaths = true }: Options = options;
    if (ignoreNonProductionPaths && isNonProductionPath(context.filename)) {
      return {};
    }
    return {
      Identifier(node: TSESTree.Identifier) {
        if (['DEBUG', '__DEV__'].includes(node.name)) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'console' &&
          propertyName(node.callee) === 'log'
        ) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
