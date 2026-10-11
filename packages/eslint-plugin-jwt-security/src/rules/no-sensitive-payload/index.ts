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
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
} from '@interlace/eslint-devkit';
import {
  isSignOperation,
  joseBuilderChain,
  resolveObject,
  SENSITIVE_PAYLOAD_FIELDS,
} from '../../utils';
import { mayCarryField } from '../../utils/type-info';
import type { NoSensitivePayloadOptions } from '../../types';

type MessageIds = 'sensitivePayloadField' | 'wholeRecordSpread';

type RuleOptions = [NoSensitivePayloadOptions?];

export const noSensitivePayload = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-payload',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-jwt-security/docs/rules/no-sensitive-payload.md',
      description:
        'Prevent storing sensitive data in JWT payload which is only base64-encoded',
      cwe: 'CWE-359',
      cvss: 5.3,
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
      wholeRecordSpread: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Whole Record Spread into JWT Payload',
        cwe: 'CWE-200',
        cvss: 5.3,
        description:
          'Spreading a whole object into the claims copies every field it has - including ones added later - into a token anyone can read',
        severity: 'MEDIUM',
        fix: 'Pick the claims explicitly: { sub: user.id, role: user.role }',
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
    const allSensitiveFields = new Set([
      ...SENSITIVE_PAYLOAD_FIELDS,
      ...additionalFields,
    ]);

    const sourceCode = context.sourceCode;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isSignOperation(node, sourceCode)) {
          return;
        }

        /*
         * Where the claims are. jose's `.sign(key)` takes only the key — the
         * claims went into `new SignJWT(claims)` at the root of the chain.
         * Everywhere else they are the first argument. Either way they are
         * resolved structurally: an inline literal, a same-file const, a
         * spread of such a const. A payload this file cannot see is silent.
         */
        const chain = joseBuilderChain(node, sourceCode);
        const payload = resolveObject(
          chain === null ? node.arguments[0] : chain.builder.arguments[0],
          sourceCode,
        );
        if (payload === null) {
          return;
        }

        /*
         * `{ ...user }` where `user` is a parameter, a call result, a row:
         * every field it has — the password hash included, and any column
         * added next year — goes into a token anyone can base64-decode. The
         * fields cannot be listed here, so the spread itself is the finding
         * (CWE-200). With type information the declared fields ARE known, and
         * the spread is reported only when one of them is sensitive.
         */
        for (const spread of payload.opaqueSpreads) {
          if (mayCarryField(spread.argument, sourceCode, allSensitiveFields)) {
            context.report({ node: spread, messageId: 'wholeRecordSpread' });
          }
        }

        for (const prop of payload.properties) {
          // A computed or quoted key is still the field being put in the
          // token. `{ ['password']: p }` leaks exactly what `{ password: p }`
          // leaks.
          const keyText = objectKeyName(prop);
          if (
            keyText !== null &&
            allSensitiveFields.has(keyText.toLowerCase())
          ) {
            context.report({
              node: prop,
              messageId: 'sensitivePayloadField',
              data: { fieldName: keyText },
            });
          }
        }
      },
    };
  },
});

export default noSensitivePayload;
