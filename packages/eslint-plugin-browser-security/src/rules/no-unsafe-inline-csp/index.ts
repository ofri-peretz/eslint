/**
 * ESLint Rule: no-unsafe-inline-csp
 * Detects 'unsafe-inline' in Content Security Policy directives
 * CWE-79: Improper Neutralization of Input During Web Page Generation
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'unsafeInline' | 'useNonceOrHash';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noUnsafeInlineCsp = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-inline-csp',
  meta: {
    type: 'problem',
    docs: {
      description: "Disallow 'unsafe-inline' in Content Security Policy",
    },
    hasSuggestions: true,
    messages: {
      unsafeInline: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: "CSP 'unsafe-inline' Detected",
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 7.5,
        description:
          "'unsafe-inline' in CSP allows inline scripts/styles to execute, defeating XSS protection.",
        severity: 'HIGH',
        fix: "Use nonces or hashes instead: script-src 'nonce-abc123' or script-src 'sha256-...'",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
      }),
      useNonceOrHash: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Nonce or Hash',
        description: 'Replace unsafe-inline with nonces or hashes',
        severity: 'LOW',
        fix: "script-src 'self' 'nonce-randomValue'; (generate nonce per-request)",
        documentationLink:
          'https://content-security-policy.com/nonce/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const UNSAFE_INLINE_PATTERN = /'unsafe-inline'/gi;

    /**
     * Check a string value for unsafe-inline
     */
    function checkForUnsafeInline(node: TSESTree.Node, value: string): void {
      if (UNSAFE_INLINE_PATTERN.test(value)) {
        context.report({
          node,
          messageId: 'unsafeInline',
          suggest: [{ messageId: 'useNonceOrHash', fix: () => null }],
        });
      }
    }

    return {
      // Check string literals
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string') {
          checkForUnsafeInline(node, node.value);
        }
      },

      // Check template literals
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        const value = node.quasis.map((q) => q.value.raw).join('');
        checkForUnsafeInline(node, value);
      },
    };
  },
});
