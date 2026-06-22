/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-innerhtml
 * Detects dangerous innerHTML/outerHTML assignments that can lead to XSS
 * CWE-79: Improper Neutralization of Input During Web Page Generation (XSS)
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://owasp.org/www-community/attacks/xss/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'dangerousInnerHTML' | 'useSanitizer';

export interface Options {
  /** Allow innerHTML in test files. Default: false */
  allowInTests?: boolean;

  /** Trusted sanitizer function names. Default: ['DOMPurify.sanitize', 'sanitize', 'sanitizeHtml'] */
  trustedSanitizers?: string[];

  /** Allow innerHTML with literal strings. Default: true */
  allowLiteralStrings?: boolean;
}

type RuleOptions = [Options?];

const DEFAULT_SANITIZERS = [
  'DOMPurify.sanitize',
  'sanitize',
  'sanitizeHtml',
  'xss',
  'purify',
];

/**
 * Check if the right side is sanitized
 */
function isSanitized(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  sanitizers: string[],
): boolean {
  const text = sourceCode.getText(node);
  return sanitizers.some((s) => text.includes(s));
}

/**
 * Check if the value is a literal string
 */
function isLiteralString(node: TSESTree.Node): boolean {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return true;
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return true;
  }
  return false;
}

export const noInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-innerhtml.md',
      description:
        'Disallow dangerous innerHTML/outerHTML assignments that can lead to XSS',
      cwe: 'CWE-79',
      cvss: 6.1,
      confidence: 'medium',
    },
    hasSuggestions: true,
    messages: {
      dangerousInnerHTML: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Cross-Site Scripting (XSS) via innerHTML',
        cwe: 'CWE-79',
        description:
          'Assigning to {{property}} with {{source}} can execute malicious scripts. This is a critical XSS vulnerability.',
        severity: 'CRITICAL',
        fix: 'Use textContent for text, or sanitize with DOMPurify.sanitize() before assignment.',
        documentationLink: 'https://owasp.org/www-community/attacks/xss/',
      }),
      useSanitizer: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use HTML Sanitizer',
        description: 'Sanitize HTML before assignment',
        severity: 'LOW',
        fix: 'element.innerHTML = DOMPurify.sanitize(userInput);',
        documentationLink: 'https://www.npmjs.com/package/dompurify',
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
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_SANITIZERS,
          },
          allowLiteralStrings: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      trustedSanitizers: DEFAULT_SANITIZERS,
      allowLiteralStrings: true,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = false,
      trustedSanitizers = DEFAULT_SANITIZERS,
      allowLiteralStrings = true,
    } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;
    const dangerousProperties = new Set(['innerHTML', 'outerHTML']);
    // Sibling DOM sinks that share the same XSS class — surfaced as
    // FN by the hand-curated stress test. See benchmarks/AUDIT_PATTERNS.md
    // §3.1 ("DOM XSS sink list"). Each takes user-controlled HTML and
    // injects it into the live DOM exactly the same way innerHTML does.
    const dangerousSinkMethods = new Set([
      'insertAdjacentHTML',
      'write',
      'writeln',
    ]);

    function reportSink(
      reportNode: TSESTree.Node,
      sinkName: string,
      taintedNode: TSESTree.Node,
    ) {
      // Allow literal strings if configured.
      if (allowLiteralStrings && isLiteralString(taintedNode)) return;
      // Allow if sanitized via a trusted sanitiser call.
      if (isSanitized(taintedNode, sourceCode, trustedSanitizers)) return;
      // Determine source type for the diagnostic message.
      let source = 'dynamic content';
      if (taintedNode.type === 'Identifier') {
        source = `variable "${taintedNode.name}"`;
      } else if (taintedNode.type === 'TemplateLiteral') {
        source = 'template literal with expressions';
      } else if (taintedNode.type === 'CallExpression') {
        source = 'function call result';
      }
      context.report({
        node: reportNode,
        messageId: 'dangerousInnerHTML',
        data: { property: sinkName, source },
        suggest: [{ messageId: 'useSanitizer', fix: () => null }],
      });
    }

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for element.innerHTML = ... or element.outerHTML = ...
        if (node.left.type !== 'MemberExpression') {
          return;
        }

        const property = node.left.property;
        /* c8 ignore next 3 - Guard for non-identifier property access */
        if (property.type !== 'Identifier') {
          return;
        }

        if (!dangerousProperties.has(property.name)) {
          return;
        }

        reportSink(node, property.name, node.right);
      },

      // element.insertAdjacentHTML(position, htmlString) — same XSS class
      // as innerHTML but a different sink shape. Also covers
      // document.write(...) and document.writeln(...) which are the
      // historic parent injection sinks.
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'MemberExpression') return;
        const property = node.callee.property;
        if (property.type !== 'Identifier') return;
        if (!dangerousSinkMethods.has(property.name)) return;
        // The HTML payload is the LAST argument for insertAdjacentHTML
        // (`(position, html)`) and the only argument for write/writeln.
        const tainted = node.arguments[node.arguments.length - 1];
        if (!tainted) return;
        reportSink(node, property.name, tainted);
      },
    };
  },
});
