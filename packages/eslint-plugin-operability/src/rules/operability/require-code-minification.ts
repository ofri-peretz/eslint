/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require minification configuration
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/656.html
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

export interface Options {
  /**
   * The property names that turn minification off. Default:
   * `['minimize', 'minify']`.
   *
   * Two spellings because two ecosystems: webpack writes `optimization.minimize`,
   * while Vite, Rollup, esbuild and Terser all write `minify`. The rule knew
   * only the first, so a Vite config shipping unminified passed — it is the
   * commoner spelling now, and the miss was total.
   *
   * These are build-tool API names rather than a guess at somebody's variable
   * naming, so a default list is the right shape. It is an option anyway
   * because build tools keep inventing spellings, and a project should not have
   * to wait for a release to name one.
   */
  minificationKeys?: readonly string[];
}

/** webpack, then everyone else. */
const DEFAULT_MINIFICATION_KEYS: readonly string[] = ['minimize', 'minify'];

type RuleOptions = [Options?];

export const requireCodeMinification = createRule<RuleOptions, MessageIds>({
  name: 'require-code-minification',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-operability/docs/rules/require-code-minification.md',
      description: 'Require minification configuration',
      cwe: 'CWE-656',
      cvss: 2.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-656',
        description:
          'Require minification configuration detected - Build config without minification',
        severity: 'LOW',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/656.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minificationKeys: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_MINIFICATION_KEYS],
            description:
              'Property names that turn minification off. webpack writes `minimize`; Vite, Rollup, esbuild and Terser write `minify`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ minificationKeys: [...DEFAULT_MINIFICATION_KEYS] }],
  create(context, [options = {}]) {
    const { minificationKeys = DEFAULT_MINIFICATION_KEYS } = options as Options;
    const keys = new Set(minificationKeys);
    return {
      Property(node: TSESTree.Property) {
        if (
          node.key.type === 'Identifier' &&
          keys.has(node.key.name) &&
          node.value.type === 'Literal' &&
          node.value.value === false
        ) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
