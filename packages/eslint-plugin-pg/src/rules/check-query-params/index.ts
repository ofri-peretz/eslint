import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { CheckQueryParamsOptions } from '../../types';

// Pre-compiled regex patterns for performance
const SINGLE_QUOTE_REGEX = /'(?:[^']|'')*'/g;
const DOUBLE_QUOTE_REGEX = /"(?:[^"]|"")*"/g;
const LINE_COMMENT_REGEX = /--.*/g;
const BLOCK_COMMENT_REGEX = /\/\*[\s\S]*?\*\//g;
const PARAM_REGEX = /\$\d+/g;

export const checkQueryParams: TSESLint.RuleModule<
  'parameterCountMismatch',
  CheckQueryParamsOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure the number of query parameters matches the arguments array.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/check-query-params.md',
    },
    messages: {
      parameterCountMismatch: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Parameter Count Mismatch',
        description: 'Query parameter count mismatch detected.',
        severity: 'HIGH',
        cwe: 'CWE-20',
        effort: 'low',
        fix: 'Ensure the number of arguments matches the number of placeholders ($1, $2, etc.).',
        documentationLink: 'https://node-postgres.com/features/queries',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.callee.property.name !== 'query'
        ) {
          return;
        }

        const args = node.arguments;
        if (args.length < 2) return;

        const queryArg = args[0];
        const valuesArg = args[1];

        if (queryArg.type !== AST_NODE_TYPES.Literal || typeof queryArg.value !== 'string') {
          return; // Can't statically analyze dynamic queries
        }

        if (valuesArg.type !== AST_NODE_TYPES.ArrayExpression) {
          return; // Can't statically count dynamic arrays
        }

        const queryText = queryArg.value;
        
        // Remove strings, quoted identifiers, and comments to avoid false positives
        const cleanText = queryText
          .replace(SINGLE_QUOTE_REGEX, '')
          .replace(DOUBLE_QUOTE_REGEX, '')
          .replace(LINE_COMMENT_REGEX, '')
          .replace(BLOCK_COMMENT_REGEX, '');

        const matches = cleanText.match(PARAM_REGEX);
        
        let maxParamIndex = 0;
        if (matches) {
          const indices = matches.map(m => parseInt(m.substring(1), 10));
          maxParamIndex = Math.max(0, ...indices);
        }

        // PG allows gaps, but essentially the highest index determines needed array length.
        // Actually, strictly speaking, if you use $2, you should provide at least 2 args.
        // But commonly, people mean "number of unique placeholders".
        // Let's enforce that array length >= max param index.
        
        const providedArgCount = valuesArg.elements.length;

        if (providedArgCount < maxParamIndex) {
          context.report({
            node: valuesArg,
            messageId: 'parameterCountMismatch',
            data: {
              expected: maxParamIndex.toString(),
              actual: providedArgCount.toString(),
            },
          });
        }
      },
    };
  },
};
