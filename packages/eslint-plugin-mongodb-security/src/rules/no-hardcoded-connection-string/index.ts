/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-hardcoded-connection-string
 * Detects hardcoded MongoDB connection strings with credentials
 * CWE-798: Hardcoded Credentials
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'hardcodedConnectionString';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const MONGODB_URI_PATTERN = /mongodb(\+srv)?:\/\/.+/i;

export const noHardcodedConnectionString = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-connection-string',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent hardcoded MongoDB connection strings with credentials' },
    hasSuggestions: true,
    messages: {
      hardcodedConnectionString: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Connection String',
        cwe: 'CWE-798',
        cvss: 7.5,
        description: 'MongoDB connection string contains hardcoded credentials',
        severity: 'HIGH',
        fix: 'Use process.env.MONGODB_URI instead of hardcoded connection strings',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options = {}] = context.options;
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    function checkLiteral(node: TSESTree.Literal) {
      if (typeof node.value === 'string' && MONGODB_URI_PATTERN.test(node.value)) {
        context.report({
          node,
          messageId: 'hardcodedConnectionString',
        });
      }
    }

    return {
      Literal: checkLiteral,
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        if (node.quasis.length > 0) {
          const firstQuasi = node.quasis[0].value.raw;
          if (MONGODB_URI_PATTERN.test(firstQuasi)) {
            context.report({
              node,
              messageId: 'hardcodedConnectionString',
            });
          }
        }
      },
    };
  },
});

export default noHardcodedConnectionString;
