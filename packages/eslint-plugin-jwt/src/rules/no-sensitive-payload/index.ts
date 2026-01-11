/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-payload
 *
 * Detects storage of sensitive data in JWT payload.
 * JWT payloads are only base64-encoded, not encrypted.
 *
 * CWE-359: Exposure of Private Personal Information
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isSignOperation, SENSITIVE_PAYLOAD_FIELDS } from '../../utils';
import type { NoSensitivePayloadOptions } from '../../types';

type MessageIds = 'sensitivePayloadField';

type RuleOptions = [NoSensitivePayloadOptions?];

export const noSensitivePayload = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-payload',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent storing sensitive data in JWT payload which is only base64-encoded',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      sensitivePayloadField: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in JWT Payload',
        cwe: 'CWE-359',
        description:
          'JWT payloads are not encrypted - sensitive data like "{{fieldName}}" can be read by anyone',
        severity: 'MEDIUM',
        fix: 'Store sensitive data server-side, reference by ID in token',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalSensitiveFields: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional field names to flag as sensitive',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          strictMode: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      additionalSensitiveFields: [],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] ?? {};
    const additionalFields = options.additionalSensitiveFields ?? [];
    const allSensitiveFields = new Set([...SENSITIVE_PAYLOAD_FIELDS, ...additionalFields]);

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isSignOperation(node)) {
          return;
        }

        if (node.arguments.length < 1) {
          return;
        }

        const payloadArg = node.arguments[0];

        // Check object literal payload
        if (payloadArg.type === 'ObjectExpression') {
          for (const prop of payloadArg.properties) {
            if (prop.type === 'Property' && prop.key.type === 'Identifier') {
              const fieldName = prop.key.name.toLowerCase();
              if (allSensitiveFields.has(fieldName)) {
                context.report({
                  node: prop,
                  messageId: 'sensitivePayloadField',
                  data: { fieldName: prop.key.name },
                });
              }
            }
          }
        }
      },
    };
  },
});

export default noSensitivePayload;
