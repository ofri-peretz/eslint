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
      description:
        'Disallow dangerous innerHTML/outerHTML assignments that can lead to XSS',
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
    const dangerousProperties = ['innerHTML', 'outerHTML'];

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

        if (!dangerousProperties.includes(property.name)) {
          return;
        }

        const rightSide = node.right;

        // Allow literal strings if configured
        if (allowLiteralStrings && isLiteralString(rightSide)) {
          return;
        }

        // Allow if sanitized
        if (isSanitized(rightSide, sourceCode, trustedSanitizers)) {
          return;
        }

        // Determine source type for message
        let source = 'dynamic content';
        if (rightSide.type === 'Identifier') {
          source = `variable "${rightSide.name}"`;
        } else if (rightSide.type === 'TemplateLiteral') {
          source = 'template literal with expressions';
        } else if (rightSide.type === 'CallExpression') {
          source = 'function call result';
        }

        context.report({
          node,
          messageId: 'dangerousInnerHTML',
          data: {
            property: property.name,
            source,
          },
          suggest: [
            {
              messageId: 'useSanitizer',
              fix: () => null,
            },
          ],
        });
      },
    };
  },
});
