/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { TSESLint, AST_NODE_TYPES, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoSelectAllOptions } from '../../types';

// Pre-compiled regex patterns for performance
const COUNT_STAR_REGEX = /COUNT\s*\(\s*\*\s*\)/g;
const SELECT_STAR_REGEX = /\bSELECT\s+\*/;
const COMMA_STAR_REGEX = /,\s*\*/;
const SELECT_KEYWORD_REGEX = /\bSELECT\b/;
const UNNEST_PATTERN_REGEX = /\bSELECT\s+\*\s+FROM\s+UNNEST\s*\(/;

export const noSelectAll: TSESLint.RuleModule<
  'noSelectAll',
  NoSelectAllOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using * in SELECT statements (implicit columns).',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-select-all.md',
    },
    messages: {
      noSelectAll: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Select All',
        description: 'Avoid using "SELECT *" which fetches all columns.',
        severity: 'MEDIUM',
        cwe: 'CWE-1049',
        effort: 'low',
        fix: 'Explicitly list the columns you need (e.g., SELECT id, name FROM ...).',
        documentationLink: 'https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_SELECT_.2A',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.callee.property.name !== 'query'
        ) {
          return;
        }

        const args = node.arguments;
        if (args.length === 0) return;
        
        const queryArg = args[0];
        
        if (queryArg.type !== AST_NODE_TYPES.Literal || typeof queryArg.value !== 'string') {
          return;
        }

        const queryText = queryArg.value;
        const upperQuery = queryText.toUpperCase();
        
        // Exclude count(*) from the check by removing it temporarily
        const cleanedQuery = upperQuery.replace(COUNT_STAR_REGEX, 'COUNT_ALL');

        // Check for "SELECT *"
        // 1. SELECT followed immediately by * (with spaces) -> SELECT *
        // 2. Comma followed by * -> SELECT a, *
        // BUT exclude SELECT * FROM UNNEST which is idiomatic for bulk inserts
        
        if (SELECT_STAR_REGEX.test(cleanedQuery) || COMMA_STAR_REGEX.test(cleanedQuery)) {
           // Ensure it is actually a SELECT query
           if (SELECT_KEYWORD_REGEX.test(cleanedQuery)) {
              // Exclude SELECT * FROM UNNEST (idiomatic bulk insert pattern)
              if (UNNEST_PATTERN_REGEX.test(cleanedQuery)) {
                return;
              }
              context.report({
                node: queryArg,
                messageId: 'noSelectAll',
              });
           }
        }
      },
    };
  },
};

