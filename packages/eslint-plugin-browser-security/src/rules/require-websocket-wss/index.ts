/**
 * ESLint Rule: require-websocket-wss
 * Requires secure WebSocket connections (wss://) instead of unencrypted (ws://)
 * CWE-319: Cleartext Transmission of Sensitive Information
 *
 * @see https://cwe.mitre.org/data/definitions/319.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'insecureWebsocket' | 'useWss';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Allow localhost/127.0.0.1 connections. Default: true */
  allowLocalhost?: boolean;
}

type RuleOptions = [Options?];

export const requireWebsocketWss = createRule<RuleOptions, MessageIds>({
  name: 'require-websocket-wss',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require secure WebSocket connections (wss://) instead of unencrypted (ws://)',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      insecureWebsocket: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure WebSocket Connection',
        cwe: 'CWE-319',
        owasp: 'A02:2021',
        cvss: 7.5,
        description:
          'WebSocket connection uses unencrypted ws:// protocol. Data transmitted is vulnerable to MITM attacks and eavesdropping.',
        severity: 'HIGH',
        fix: 'Use wss:// (WebSocket Secure) instead of ws:// for encrypted connections.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
      }),
      useWss: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Secure WebSocket',
        description: 'Replace ws:// with wss:// for encrypted connection',
        severity: 'LOW',
        fix: "Change 'ws://' to 'wss://'",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
          allowLocalhost: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, allowLocalhost: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true, allowLocalhost = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * Check if URL is localhost
     */
    function isLocalhostUrl(url: string): boolean {
      return (
        url.includes('://localhost') ||
        url.includes('://127.0.0.1') ||
        url.includes('://0.0.0.0') ||
        url.includes('://[::1]')
      );
    }

    /**
     * Check if a string literal is an insecure WebSocket URL
     */
    function checkWebSocketUrl(
      node: TSESTree.NewExpression,
      urlArg: TSESTree.Node,
    ): void {
      if (
        urlArg.type === AST_NODE_TYPES.Literal &&
        typeof urlArg.value === 'string'
      ) {
        const url = urlArg.value;

        // Skip if localhost is allowed
        if (allowLocalhost && isLocalhostUrl(url)) {
          return;
        }

        // Check for insecure ws:// protocol
        if (url.startsWith('ws://')) {
          const fixedUrl = url.replace('ws://', 'wss://');
          context.report({
            node: urlArg,
            messageId: 'insecureWebsocket',
            fix: (fixer) => fixer.replaceText(urlArg, `'${fixedUrl}'`),
            suggest: [
              {
                messageId: 'useWss',
                fix: (fixer) => fixer.replaceText(urlArg, `'${fixedUrl}'`),
              },
            ],
          });
        }
      }

      // Check template literals
      if (urlArg.type === AST_NODE_TYPES.TemplateLiteral) {
        const firstQuasi = urlArg.quasis[0];
        if (firstQuasi && firstQuasi.value.raw.startsWith('ws://')) {
          // Skip localhost in template literals too
          if (allowLocalhost && isLocalhostUrl(firstQuasi.value.raw)) {
            return;
          }

          const sourceCode = context.sourceCode || context.getSourceCode();
          const originalText = sourceCode.getText(urlArg);
          const fixedText = originalText.replace('ws://', 'wss://');

          context.report({
            node: urlArg,
            messageId: 'insecureWebsocket',
            suggest: [
              {
                messageId: 'useWss',
                fix: (fixer) => fixer.replaceText(urlArg, fixedText),
              },
            ],
          });
        }
      }
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        // Check for new WebSocket()
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'WebSocket'
        ) {
          const urlArg = node.arguments[0];
          if (urlArg) {
            checkWebSocketUrl(node, urlArg);
          }
        }
      },
    };
  },
});
