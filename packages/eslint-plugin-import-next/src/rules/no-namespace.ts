/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-namespace
 * Forbid namespace (a.k.a. "wildcard" *) imports
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-namespace.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noNamespace';

export interface Options {
  /** Patterns to ignore (glob patterns for the import source) */
  ignore?: string[];
}

type RuleOptions = [Options?];

export const noNamespace = createRule<RuleOptions, MessageIds>({
  name: 'no-namespace',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-namespace.md',
      description: 'Forbid namespace (a.k.a. "wildcard" *) imports',
      cwe: 'CWE-1078',
      cvss: 2.5,
    },
    fixable: 'code',
    messages: {
      noNamespace: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Namespace Import',
        cwe: 'CWE-1078',
        description: 'Namespace imports are not recommended',
        severity: 'LOW',
        fix: 'Use named imports instead: import { foo, bar } from "..."',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-namespace.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ ignore: [] }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const ignorePatterns = options.ignore || [];

    function isIgnored(source: string): boolean {
      return ignorePatterns.some((pattern: string) => {
        // Escape ALL regex metacharacters — including `*`, `?`, and `\` — so
        // the subsequent replaces can find the now-escaped `\*` and `\?` and
        // translate them back to glob meanings. Without escaping `*` and `?`,
        // the inner replaces don't match anything and raw `*` / `?` reach
        // `new RegExp()` (CodeQL: `js/incomplete-sanitization`).
        const escaped = pattern.replace(/[.+^${}()|[\]\\*?]/g, '\\$&');
        const regex = new RegExp(
          '^' +
            escaped
              .replace(/\\\*/g, '.*')
              .replace(/\\\?/g, '.') +
            '$',
        );
        return regex.test(source);
      });
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const source = node.source.value as string;

        if (isIgnored(source)) {
          return;
        }

        node.specifiers.forEach((spec: TSESTree.ImportClause) => {
          if (spec.type === 'ImportNamespaceSpecifier') {
            context.report({
              node: spec,
              messageId: 'noNamespace',
            });
          }
        });
      },
    };
  },
});
