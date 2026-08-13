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
import { createPayloadResolver } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';
import { resolveInitializer } from '../../utils/resolve-binding';

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

/**
 * Are these arguments all string constants, and is there at least one?
 *
 * "At least one" matters: `make()()` tells us nothing about what `make`
 * closed over, so an empty argument list is not evidence of constness.
 */
function isConstantArgumentList(args: readonly TSESTree.Node[]): boolean {
  return args.length > 0 && args.every((arg) => isLiteralString(arg));
}

/**
 * Is this payload a **compiled constant template**, invoked with no arguments?
 *
 * `const template = hbs('<div class="captcha-footer">…</div>'); …
 * container.insertAdjacentHTML('beforeend', template())` is the shape in
 * okta-signin-widget `src/v2/view-builder/views/captcha/CaptchaView.js:294`.
 * The template text is a string literal written in that file, and the call
 * passes it nothing: there is no dynamic data anywhere in the expression, so
 * the rendered HTML is fixed at authoring time exactly as a literal is.
 *
 * The rule reported it because `reportSink` treated *every* CallExpression
 * payload as "function call result" — the predicate asked what SHAPE the
 * payload had, never whether any value could flow through it.
 *
 * The two conditions are what keep this from swallowing real findings.
 * Arguments at the call site (`template(user)`) are data flowing in;
 * a non-constant argument at construction (`hbs(userTemplate)`) is data
 * baked in. Either one and the payload is reported as before — which is why
 * okta's `getFallbackMessage(fallback)` / `getMessage(fallback)` sinks and
 * every `loc()`/`sprintf()` payload still report.
 */
function isConstantTemplateInvocation(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== 'CallExpression') return false;
  // Anything passed at the call site is dynamic data by default.
  if (node.arguments.length > 0) return false;

  const callee = node.callee;
  // `hbs('<div/>')()` — compiled and invoked in one expression.
  if (callee.type === 'CallExpression') {
    return isConstantArgumentList(callee.arguments);
  }
  if (callee.type !== 'Identifier') return false;

  // Resolved through scope, not by scanning nearby text: a same-named binding
  // from an unrelated block must not answer for this one. `resolveInitializer`
  // also refuses any binding that is written more than once.
  const init = resolveInitializer(callee, sourceCode);
  if (init === undefined || init.type !== 'CallExpression') return false;
  return isConstantArgumentList(init.arguments);
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

    /**
     * `write` and `writeln` are DOM sinks only on a *document*.
     *
     * The method name alone is one of the most overloaded in JavaScript:
     * `process.stdout.write`, `stderr.write`, `socket.write`, `res.write`,
     * `stream.write`, `buffer.write`. Matching on it made every CLI progress
     * message an XSS finding — 23 of the 73 corpus findings for this rule were
     * Node streams, mostly `Shopify/cli` writing to stdout.
     *
     * `insertAdjacentHTML` needs no such gate: nothing outside the DOM is
     * called that.
     */
    function isDocumentReceiver(object: TSESTree.Node): boolean {
      // `document.write(...)`
      if (object.type === 'Identifier') {
        return object.name === 'document' || /^(?:.*[a-z])?[Dd]oc(?:ument)?$/.test(object.name);
      }
      // `window.document.write(...)`, `iframe.contentDocument.write(...)`,
      // `el.ownerDocument.write(...)`
      if (object.type === 'MemberExpression' && object.property.type === 'Identifier') {
        return /^(?:content|owner)?[Dd]ocument$/.test(object.property.name);
      }
      return false;
    }

    function reportSink(
      reportNode: TSESTree.Node,
      sinkName: string,
      taintedNode: TSESTree.Node,
    ) {
      // Owned by a source-specific rule? Then this is not ours. The two tests
      // are complements — a source rule reports only what it can attribute, we
      // report only what it cannot — so exactly one rule reports any value.
      // Before this, both did, at the identical range, in `recommended`.
      if (payloadSource(taintedNode) !== undefined) return;
      // Allow constant HTML if configured. A no-argument call on a template
      // compiled from constant strings emits a fixed document, so it belongs
      // to the same category as a literal and rides the same switch — see
      // isConstantTemplateInvocation.
      if (
        allowLiteralStrings &&
        (isLiteralString(taintedNode) ||
          isConstantTemplateInvocation(taintedNode, sourceCode))
      ) {
        return;
      }
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

    const payloadSource = createPayloadResolver(context.sourceCode);

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for element.innerHTML = ... or element.outerHTML = ...
        if (node.left.type !== 'MemberExpression') {
          return;
        }

        const property = node.left.property;
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
        // `write`/`writeln` are only DOM sinks on a document — see
        // isDocumentReceiver. Without this, every `process.stdout.write` in a
        // CLI was reported as XSS.
        if (
          (property.name === 'write' || property.name === 'writeln') &&
          !isDocumentReceiver(node.callee.object)
        ) {
          return;
        }
        // The HTML payload is the LAST argument for insertAdjacentHTML
        // (`(position, html)`) and the only argument for write/writeln.
        const tainted = node.arguments[node.arguments.length - 1];
        if (!tainted) return;
        reportSink(node, property.name, tainted);
      },
    };
  },
});
