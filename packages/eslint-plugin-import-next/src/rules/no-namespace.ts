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
      description: 'Forbid namespace (a.k.a. "wildcard" *) imports',
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
        // Simple glob matching
        const regex = new RegExp(
          '^' +
            pattern
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.')
              .replace(/\//g, '\\/') +
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
