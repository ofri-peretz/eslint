/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-named-as-default-member
 * Forbid use of exported name as property of default export
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default-member.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'namedAsDefaultMember';

type RuleOptions = [];

export const noNamedAsDefaultMember = createRule<RuleOptions, MessageIds>({
  name: 'no-named-as-default-member',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-named-as-default-member.md',
      description: 'Forbid use of exported name as property of default export',
      cwe: 'CWE-1078',
      cvss: 2.5,
    },
    messages: {
      namedAsDefaultMember: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Named as Default Member',
        cwe: 'CWE-1078',
        description:
          'Accessing "{{name}}" as property of default import. Import it directly instead',
        severity: 'LOW',
        fix: 'Import the named export directly: import { {{name}} } from "..."',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default-member.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Track default imports and their sources
    const defaultImports = new Map<
      string,
      { source: string; node: TSESTree.ImportDefaultSpecifier }
    >();
    // Track named imports per source
    const namedImportsBySource = new Map<string, Set<string>>();

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const source = node.source.value as string;

        node.specifiers.forEach((spec: TSESTree.ImportClause) => {
          if (spec.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
            defaultImports.set(spec.local.name, { source, node: spec });
          } else if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
            if (!namedImportsBySource.has(source)) {
              namedImportsBySource.set(source, new Set());
            }
            const importedName =
              spec.imported.type === AST_NODE_TYPES.Identifier
                ? spec.imported.name
                : spec.imported.value;
            namedImportsBySource.get(source)?.add(importedName);
          }
        });
      },

      MemberExpression(node: TSESTree.MemberExpression) {
        // Check if accessing property of default import
        if (node.object.type !== AST_NODE_TYPES.Identifier) {
          return;
        }

        const defaultImportInfo = defaultImports.get(node.object.name);
        if (!defaultImportInfo) return;

        /**
         * `foo['bar']` reaches the same property as `foo.bar`, and minifiers,
         * codegen and any key that is not a valid identifier all write it that
         * way. Skipping every computed access — which this rule did — meant
         * one spelling of the mistake reported and the other did not.
         *
         * A computed key that is NOT a literal (`foo[k]`) still returns: the
         * key is decided at runtime, and guessing which property it names is
         * the data-flow question this rule deliberately does not ask.
         */
        const propertyName =
          node.property.type === AST_NODE_TYPES.Identifier && !node.computed
            ? node.property.name
            : node.property.type === AST_NODE_TYPES.Literal &&
                typeof node.property.value === 'string'
              ? node.property.value
              : null;
        if (propertyName === null) return;

        // Check if this property is a known named export from the same source
        const namedExports = namedImportsBySource.get(defaultImportInfo.source);
        if (namedExports && namedExports.has(propertyName)) {
          context.report({
            node,
            messageId: 'namedAsDefaultMember',
            data: { name: propertyName },
          });
        }
      },
    };
  },
});
