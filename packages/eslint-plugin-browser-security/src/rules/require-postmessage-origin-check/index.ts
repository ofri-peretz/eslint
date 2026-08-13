/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-postmessage-origin-check
 * Detects postMessage listeners without origin validation
 * CWE-346: Origin Validation Error
 *
 * @see https://cwe.mitre.org/data/definitions/346.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';
import { isAnchoredRegexpTest } from '../../utils/regexp-anchoring';

type MessageIds = 'missingOriginCheck' | 'addOriginCheck';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;

  /** Trusted origins that satisfy the check. Default: [] */
  trustedOrigins?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if a function body contains origin validation
 */
function hasOriginCheck(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const text = sourceCode.getText(node);

  // Common origin validation patterns
  const originPatterns = [
    /event\.origin\s*[!=]==?\s*/,
    /e\.origin\s*[!=]==?\s*/,
    /\.origin\s*[!=]==?\s*/,
    /origin\s*[!=]==?\s*/,
    /checkOrigin/i,
    /validateOrigin/i,
    /isAllowedOrigin/i,
    /trustedOrigins/i,
    /allowedOrigins/i,
  ];

  return originPatterns.some((pattern) => pattern.test(text));
}

export const requirePostmessageOriginCheck = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'require-postmessage-origin-check',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/require-postmessage-origin-check.md',
      description: 'Require origin validation in postMessage event listeners',
      cwe: 'CWE-346',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      missingOriginCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing postMessage Origin Validation',
        cwe: 'CWE-346',
        description:
          'postMessage listener lacks origin check. Malicious sites can send messages that will be processed.',
        severity: 'HIGH',
        fix: "Add origin validation: if (event.origin !== 'https://trusted-domain.com') return;",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns',
      }),
      addOriginCheck: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Origin Check',
        description: 'Validate event.origin before processing message',
        severity: 'LOW',
        fix: "if (event.origin !== 'https://expected-origin.com') return;",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
          },
          trustedOrigins: {
            type: 'array',
            items: { type: 'string' },
            default: [], description: 'Origins accepted without an explicit check'
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      trustedOrigins: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    /**
     * Handlers the text patterns above found no origin check in, held back
     * until `Program:exit`.
     *
     * `ALLOWED_ORIGIN.test(event.origin)` is an origin check that spells the
     * word `origin` only as a property read, so none of the `origin ===` text
     * patterns match it and every regexp-guarded listener was reported. The
     * check may also be written after the point ESLint visits the listener, so
     * the verdict has to wait until the whole program has been walked.
     */
    const unverified: TSESTree.Node[] = [];

    /** Ranges of `ALLOWED.test(x.origin)` calls with a fully anchored pattern. */
    const anchoredOriginTests: Array<readonly [number, number]> = [];

    /** Is this argument an `.origin` read — `event.origin`, `e.origin`? */
    function isOriginRead(node: TSESTree.Node): boolean {
      return (
        node.type === 'MemberExpression' &&
        !node.computed &&
        node.property.type === 'Identifier' &&
        node.property.name === 'origin'
      );
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        if (
          node.arguments.length === 1 &&
          isOriginRead(node.arguments[0]) &&
          isAnchoredRegexpTest(node, sourceCode)
        ) {
          anchoredOriginTests.push([node.range[0], node.range[1]]);
        }

        // Check for addEventListener('message', handler) or window.addEventListener('message', handler)
        let isMessageListener = false;

        // window.addEventListener('message', ...) or this.addEventListener('message', ...)
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'addEventListener'
        ) {
          const eventArg = node.arguments[0];
          if (
            eventArg &&
            eventArg.type === 'Literal' &&
            eventArg.value === 'message'
          ) {
            isMessageListener = true;
          }
        }

        // Direct addEventListener('message', ...) - global scope
        if (
          callee.type === 'Identifier' &&
          callee.name === 'addEventListener'
        ) {
          const eventArg = node.arguments[0];
          if (
            eventArg &&
            eventArg.type === 'Literal' &&
            eventArg.value === 'message'
          ) {
            isMessageListener = true;
          }
        }

        if (!isMessageListener) {
          return;
        }

        // Get the handler function
        const handlerArg = node.arguments[1];
        if (!handlerArg) {
          return;
        }

        // Check if handler has origin validation
        if (
          handlerArg.type === 'FunctionExpression' ||
          handlerArg.type === 'ArrowFunctionExpression'
        ) {
          if (!hasOriginCheck(handlerArg, sourceCode)) {
            unverified.push(handlerArg);
          }
        }

        // Handler is a reference (variable) - can't analyze
        if (handlerArg.type === 'Identifier') {
          // Could add more sophisticated analysis here
          // For now, we skip variable references as they may be validated elsewhere
        }
      },

      'Program:exit'() {
        for (const handler of unverified) {
          const guarded = anchoredOriginTests.some(
            ([start, end]) =>
              start >= handler.range[0] && end <= handler.range[1],
          );
          if (guarded) continue;
          context.report({
            node: handler,
            messageId: 'missingOriginCheck',
            suggest: [
              {
                messageId: 'addOriginCheck',
                fix: () => null,
              },
            ],
          });
        }
      },
    };
  },
});
