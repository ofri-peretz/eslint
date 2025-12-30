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
      description: 'Forbid use of exported name as property of default export',
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

        node.specifiers.forEach((spec) => {
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
            namedImportsBySource.get(source)!.add(importedName);
          }
        });
      },

      MemberExpression(node: TSESTree.MemberExpression) {
        // Check if accessing property of default import
        if (
          node.object.type !== AST_NODE_TYPES.Identifier ||
          !defaultImports.has(node.object.name)
        ) {
          return;
        }

        // Skip computed properties like obj[prop]
        if (node.computed) return;

        const defaultImportInfo = defaultImports.get(node.object.name)!;

        // Get the property name being accessed
        if (node.property.type !== AST_NODE_TYPES.Identifier) return;
        const propertyName = node.property.name;

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
