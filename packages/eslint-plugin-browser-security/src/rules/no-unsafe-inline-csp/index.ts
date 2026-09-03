/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
  isTestFilePath,
  MessageIcons,
  objectKeyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'unsafeInline';

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-unsafe-inline-csp.md',
      description: "Disallow 'unsafe-inline' in Content Security Policy",
      cwe: 'CWE-79',
      cvss: 7.5,
    },
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
    const filename = context.filename;
    const isTestFile = isTestFilePath(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // NOT global. `/…/g.test()` advances `lastIndex` on every match and
    // resumes from there on the next call, so in a file with two CSP strings
    // the second one was searched from an offset past its own match and came
    // back false — then reset, so the third reported again. Every second
    // finding in a file was silently dropped by the flag alone.
    const UNSAFE_INLINE_PATTERN = /'unsafe-inline'/i;

    /**
     * Directive names that only appear in a Content-Security-Policy.
     *
     * Presence of one is what makes a string a POLICY rather than a string
     * that happens to contain the token — `["'unsafe-inline'"]` in a table of
     * CSP keywords, a docs example, a test name. Shape is not meaning: the
     * rule asserts that inline scripts will execute, which is only true of a
     * policy that is actually served.
     */
    const CSP_DIRECTIVES =
      /\b(?:default|script|style|img|connect|font|frame|media|object|worker|child|manifest|prefetch|base|form)-(?:src|uri|action)(?:-elem|-attr)?\b/i;

    /** Header and property names that name a Content-Security-Policy. */
    // oxlint-disable-next-line consistent-function-scoping
    const isCspName = (name: string): boolean =>
      /^content-security-policy(-report-only)?$/i.test(name) ||
      /^contentsecuritypolicy(reportonly)?$/i.test(name) ||
      name.toLowerCase() === 'csp';

    /**
     * Is this string written where a CSP is delivered?
     *
     * `res.setHeader('Content-Security-Policy', value)`, `{ 'Content-Security-Policy': value }`,
     * `<meta httpEquiv="Content-Security-Policy" content={value} />`.
     */
    function atCspSink(node: TSESTree.Node): boolean {
      // Every node the visitors hand us is reached from Program, so it always
      // has a parent — only Program itself does not, and Program is never a
      // Literal or TemplateLiteral. Asserting beats an unreachable branch;
      // same reasoning as `declarationName` in `no-http-urls`.
      const parent = node.parent as TSESTree.Node;
      // Second argument of a two-argument header setter.
      if (
        parent.type === AST_NODE_TYPES.CallExpression &&
        parent.arguments[1] === node
      ) {
        const first = parent.arguments[0];
        return (
          first.type === AST_NODE_TYPES.Literal &&
          typeof first.value === 'string' &&
          isCspName(first.value)
        );
      }
      // Object property whose key names the header.
      if (parent.type === AST_NODE_TYPES.Property && parent.value === node) {
        // `objectKeyName` resolves bare, quoted and computed-static keys
        // alike; the rule previously required an Identifier and so saw only
        // the first of the three.
        const keyText = objectKeyName(parent);
        return keyText !== null && isCspName(keyText);
      }
      // `content="…"` on a meta tag that declares the policy.
      if (
        parent.type === AST_NODE_TYPES.JSXExpressionContainer ||
        parent.type === AST_NODE_TYPES.JSXAttribute
      ) {
        const attribute =
          parent.type === AST_NODE_TYPES.JSXAttribute ? parent : parent.parent;
        if (
          attribute?.type !== AST_NODE_TYPES.JSXAttribute ||
          attribute.name.type !== AST_NODE_TYPES.JSXIdentifier ||
          attribute.name.name !== 'content'
        ) {
          return false;
        }
        // A JSXAttribute's parent is a JSXOpeningElement by grammar, so this
        // is an assertion rather than a branch nothing can take.
        const element = attribute.parent as TSESTree.JSXOpeningElement;
        return element.attributes.some(
          (other) =>
            other.type === AST_NODE_TYPES.JSXAttribute &&
            other.name.type === AST_NODE_TYPES.JSXIdentifier &&
            /^http-?equiv$/i.test(other.name.name) &&
            other.value?.type === AST_NODE_TYPES.Literal &&
            typeof other.value.value === 'string' &&
            isCspName(other.value.value),
        );
      }
      return false;
    }

    /**
     * Check a string value for unsafe-inline
     */
    function checkForUnsafeInline(node: TSESTree.Node, value: string): void {
      if (!UNSAFE_INLINE_PATTERN.test(value)) return;
      // A policy names at least one directive, or is delivered somewhere this
      // rule can see. Otherwise the token is just a string.
      if (!CSP_DIRECTIVES.test(value) && !atCspSink(node)) return;
      context.report({
        node,
        messageId: 'unsafeInline',
      });
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
