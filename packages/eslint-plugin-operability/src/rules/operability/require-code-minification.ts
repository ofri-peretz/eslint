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
  followConst,
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  propertyName,
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
    interop: { runtimes: ['eslint', 'oxlint'] },
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
  createOnce(context, currentOptions) {
    let keys: Set<string>;
    /**
     * Only an explicit `false` turns minification off - the literal, or a
     * const bound to it. `true`, a tool name and a value the code does not
     * prove (a parameter) are not findings.
     */
    const isFalse = (node: TSESTree.Node): boolean => {
      const value = followConst(node, context.sourceCode);
      return value.type === 'Literal' && value.value === false;
    };
    return {
      before() {
        const [options = {}] = currentOptions();
        const { minificationKeys = DEFAULT_MINIFICATION_KEYS } =
          options as Options;
        keys = new Set(minificationKeys);
      },
      // `{ minify: false }`, `{ 'minify': false }`, `{ ['minify']: false }`.
      Property(node: TSESTree.Property) {
        if (node.parent.type !== 'ObjectExpression') return;
        const key = objectKeyName(node);
        if (key !== null && keys.has(key) && isFalse(node.value)) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
      // `config.build.minify = false`, `config.build['minify'] = false`.
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.operator !== '=' || node.left.type !== 'MemberExpression')
          return;
        const key = propertyName(node.left);
        if (key !== null && keys.has(key) && isFalse(node.right)) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
