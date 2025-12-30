/**
 * ESLint Rule: no-named-default
 * Forbid named default exports
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-default.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'namedDefault';

type RuleOptions = [];

export const noNamedDefault = createRule<RuleOptions, MessageIds>({
  name: 'no-named-default',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbid named default exports',
    },
    messages: {
      namedDefault: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Named Default Import',
        cwe: 'CWE-1078',
        description: 'Using named import of default export',
        severity: 'LOW',
        fix: 'Use default import syntax: import foo from "..." instead of import { default as foo } from "..."',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-default.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        node.specifiers.forEach((spec: TSESTree.ImportClause) => {
          if (spec.type === 'ImportSpecifier') {
            const importedName =
              spec.imported.type === 'Identifier'
                ? spec.imported.name
                : spec.imported.value;

            if (importedName === 'default') {
              context.report({
                node: spec,
                messageId: 'namedDefault',
              });
            }
          }
        });
      },
    };
  },
});
