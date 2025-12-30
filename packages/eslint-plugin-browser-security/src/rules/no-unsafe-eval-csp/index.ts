/**
 * ESLint Rule: no-unsafe-eval-csp
 * Detects 'unsafe-eval' in Content Security Policy directives
 * CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code
 *
 * @see https://cwe.mitre.org/data/definitions/95.html
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'unsafeEval' | 'removeUnsafeEval';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noUnsafeEvalCsp = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-eval-csp',
  meta: {
    type: 'problem',
    docs: {
      description: "Disallow 'unsafe-eval' in Content Security Policy",
    },
    hasSuggestions: true,
    messages: {
      unsafeEval: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: "CSP 'unsafe-eval' Detected",
        cwe: 'CWE-95',
        owasp: 'A03:2021',
        cvss: 8.1,
        description:
          "'unsafe-eval' in CSP allows eval(), new Function(), and setTimeout(string). This enables code injection attacks.",
        severity: 'HIGH',
        fix: "Remove 'unsafe-eval' and refactor code to avoid eval-like patterns.",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src',
      }),
      removeUnsafeEval: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: "Remove 'unsafe-eval'",
        description: 'Refactor code to avoid eval() and remove unsafe-eval from CSP',
        severity: 'LOW',
        fix: "script-src 'self'; // Remove 'unsafe-eval'",
        documentationLink:
          'https://web.dev/strict-csp/',
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

    const UNSAFE_EVAL_PATTERN = /'unsafe-eval'/gi;

    /**
     * Check a string value for unsafe-eval
     */
    function checkForUnsafeEval(node: TSESTree.Node, value: string): void {
      if (UNSAFE_EVAL_PATTERN.test(value)) {
        context.report({
          node,
          messageId: 'unsafeEval',
          suggest: [{ messageId: 'removeUnsafeEval', fix: () => null }],
        });
      }
    }

    return {
      // Check string literals
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string') {
          checkForUnsafeEval(node, node.value);
        }
      },

      // Check template literals
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        const value = node.quasis.map((q) => q.value.raw).join('');
        checkForUnsafeEval(node, value);
      },
    };
  },
});
