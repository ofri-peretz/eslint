/**
 * ESLint Rule: no-decode-without-verify
 *
 * Detects usage of jwt.decode() or jwt-decode library without corresponding
 * verification. Decoded JWTs can be tampered with by attackers.
 *
 * CWE-345: Insufficient Verification of Data Authenticity
 *
 * @see https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons, hasSafeAnnotation } from '@interlace/eslint-devkit';
import { isDecodeOperation } from '../../utils';
import type { NoDecodeWithoutVerifyOptions } from '../../types';

type MessageIds =
  | 'decodeWithoutVerify'
  | 'jwtDecodeLibrary'
  | 'useVerifyInstead';

type RuleOptions = [NoDecodeWithoutVerifyOptions?];

export const noDecodeWithoutVerify = createRule<RuleOptions, MessageIds>({
  name: 'no-decode-without-verify',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow trusting decoded JWT payload without signature verification',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      decodeWithoutVerify: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Decoded JWT Without Verification',
        cwe: 'CWE-345',
        description:
          'jwt.decode() returns payload without verifying signature - data can be forged',
        severity: 'HIGH',
        fix: 'Use jwt.verify(token, secret) instead of jwt.decode(token)',
        documentationLink:
          'https://owasp.org/API-Security/0xa7-security-misconfiguration/',
      }),
      jwtDecodeLibrary: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'jwt-decode Library Usage',
        cwe: 'CWE-345',
        description:
          'jwt-decode library only decodes tokens, never verifies signatures',
        severity: 'HIGH',
        fix: 'Use jsonwebtoken.verify() or jose.jwtVerify() for verification',
        documentationLink: 'https://www.npmjs.com/package/jwt-decode',
      }),
      useVerifyInstead: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Verify Instead',
        description: 'Replace decode with verify to ensure authenticity',
        severity: 'LOW',
        fix: 'jwt.verify(token, secret, { algorithms: ["RS256"] })',
        documentationLink: 'https://www.npmjs.com/package/jsonwebtoken',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowHeaderInspection: {
            type: 'boolean',
            default: false,
            description:
              'Allow decode() for reading header before verification',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: ['@decoded-header-only', '@verified-separately'],
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
      allowHeaderInspection: false,
      trustedSanitizers: [],
      trustedAnnotations: ['@decoded-header-only', '@verified-separately'],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] ?? {};
    const { trustedAnnotations = [] } = options;

    /**
     * Check if this is a jwt-decode import usage
     */
    const isJwtDecodeLibrary = (node: TSESTree.CallExpression): boolean => {
      // Direct call: jwtDecode(token)
      if (
        node.callee.type === 'Identifier' &&
        (node.callee.name === 'jwtDecode' || node.callee.name === 'jwt_decode')
      ) {
        return true;
      }
      return false;
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for jwt.decode() pattern
        if (isDecodeOperation(node)) {
          /* c8 ignore start -- hasSafeAnnotation requires ESLint comment simulation in tests */
          // Check for safe annotations
          if (hasSafeAnnotation(node, context, trustedAnnotations)) {
            return;
          }
          /* c8 ignore stop */

          context.report({
            node,
            messageId: 'decodeWithoutVerify',
          });
          return;
        }

        // Check for jwt-decode library usage
        if (isJwtDecodeLibrary(node)) {
          /* c8 ignore start -- hasSafeAnnotation requires ESLint comment simulation in tests */
          // Check for safe annotations
          if (hasSafeAnnotation(node, context, trustedAnnotations)) {
            return;
          }
          /* c8 ignore stop */

          context.report({
            node,
            messageId: 'jwtDecodeLibrary',
          });
        }
      },
    };
  },
});

export default noDecodeWithoutVerify;
