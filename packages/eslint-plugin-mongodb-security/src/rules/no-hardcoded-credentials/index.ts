/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-hardcoded-credentials
 * Detects hardcoded MongoDB auth credentials in connection options
 * CWE-798: Hardcoded Credentials
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'hardcodedCredentials';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

const CREDENTIAL_KEYS = ['user', 'username', 'pass', 'password', 'auth'];

export const noHardcodedCredentials = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-credentials',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent hardcoded MongoDB authentication credentials' },
    hasSuggestions: true,
    messages: {
      hardcodedCredentials: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Credentials',
        cwe: 'CWE-798',
        cvss: 7.5,
        description: 'MongoDB authentication credentials are hardcoded',
        severity: 'HIGH',
        fix: 'Use environment variables for username and password',
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

    return {
      Property(node: TSESTree.Property) {
        const keyName = node.key.type === AST_NODE_TYPES.Identifier
          ? node.key.name
          : node.key.type === AST_NODE_TYPES.Literal
            ? String(node.key.value)
            : null;

        if (!keyName || !CREDENTIAL_KEYS.includes(keyName.toLowerCase())) {
          return;
        }

        if (node.value.type === AST_NODE_TYPES.Literal && typeof node.value.value === 'string') {
          if (node.value.value.length > 0) {
            context.report({
              node,
              messageId: 'hardcodedCredentials',
            });
          }
        }
      },
    };
  },
});

export default noHardcodedCredentials;
