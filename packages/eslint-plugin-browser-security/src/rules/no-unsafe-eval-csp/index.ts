/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
  isTestFilePath,
} from '@interlace/eslint-devkit';
import {
  cspSourceKeyword,
  isCspSourceListElement,
  policyGrantsKeyword,
} from '../../utils/csp-directive';

type MessageIds = 'unsafeEval';

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-unsafe-eval-csp.md',
      description: "Disallow 'unsafe-eval' in Content Security Policy",
      cwe: 'CWE-95',
      cvss: 8.1,
    },
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

    const UNSAFE_EVAL = 'unsafe-eval';
    const sourceCode = context.sourceCode;

    /**
     * Does this string, read as a POLICY, grant `'unsafe-eval'`?
     *
     * This used to be `/'unsafe-eval'/gi.test(value)` against a module-level
     * regex, which was wrong three ways and measurably so:
     *
     * - `/g` makes `.test()` STATEFUL. `lastIndex` survives every call, so a
     *   file with four identical unsafe policies reported two of them, and a
     *   short policy linted after a long one in the same process reported
     *   none. ESLint lints a whole project through one Linter, so this leaked
     *   between files as well as within them.
     * - Substring, not token. It could only ever see a policy that had already
     *   been serialised WITH apostrophes, missing every builder that quotes on
     *   output — see utils/csp-directive.
     * - No notion of context, so the build guard that REFUSES the directive
     *   and the docs page that explains why were both findings.
     */
    function checkPolicyText(node: TSESTree.Node, value: string): void {
      if (policyGrantsKeyword(value, UNSAFE_EVAL)) {
        context.report({ node, messageId: 'unsafeEval' });
      }
    }

    return {
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') return;

        // A whole serialised policy: `script-src 'self' 'unsafe-eval'`.
        checkPolicyText(node, node.value);

        // A single source expression sitting in a directive's source list —
        // quoted or bare. Only reported where a source actually belongs, which
        // is proven from the AST, never from the string's spelling.
        if (
          cspSourceKeyword(node.value) === UNSAFE_EVAL &&
          isCspSourceListElement(node, sourceCode)
        ) {
          context.report({ node, messageId: 'unsafeEval' });
        }
      },

      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // The literal chunks only, joined by a space so an interpolation
        // cannot weld two tokens into one. `${a}${b}` must not read as a
        // single directive name.
        checkPolicyText(node, node.quasis.map((q) => q.value.raw).join(' '));
      },
    };
  },
});
