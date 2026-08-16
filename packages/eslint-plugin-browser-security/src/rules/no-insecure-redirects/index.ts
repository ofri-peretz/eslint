/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-redirects
 * Detects open redirect vulnerabilities
 * CWE-601: URL Redirection to Untrusted Site ('Open Redirect')
 * 
 * @see https://cwe.mitre.org/data/definitions/601.html
 * @see https://owasp.org/www-community/vulnerabilities/Unvalidated_Redirects_and_Forwards
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { isAttackerSteerableUrl, isLocationObject } from '../../utils/url-taint';
import { isAnchoredHostGuard } from '../../utils/regexp-anchoring';

type MessageIds =
  | 'insecureRedirect';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Allowed redirect domains. Default: [] */
  allowedDomains?: string[];
}

type RuleOptions = [Options?];

/**
 * Is this call a *navigation*, as opposed to something that merely shares a
 * method name with one?
 *
 * `assign` and `replace` are two of the most overloaded names in JavaScript —
 * `Object.assign`, `String.prototype.replace`, `Array.prototype.replace` — and
 * matching them bare turned `Object.assign(parseFromUrlFn, {…})` into an open
 * redirect. They navigate only when the receiver is a `Location`.
 *
 * `redirect` carries no such ambiguity (`res.redirect`, `Response.redirect`),
 * so it is accepted on any receiver.
 */
function isNavigationSink(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier'
  ) {
    return false;
  }
  const method = callee.property.name;
  if (method === 'redirect') {
    return true;
  }
  return (
    (method === 'assign' || method === 'replace') &&
    isLocationObject(callee.object)
  );
}

/**
 * Check if redirect URL is validated
 */
function isRedirectValidated(
  node: TSESTree.CallExpression,
  sourceCode: TSESLint.SourceCode
): boolean {
  // Taint is decided from the ARGUMENT alone — see utils/url-taint.ts for why
  // reading the whole call text made every `window.location.assign(…)` a
  // finding regardless of what was passed to it.
  const target = node.arguments[0];
  const hasUserInput =
    target !== undefined && isAttackerSteerableUrl(target, sourceCode);

  if (!hasUserInput) {
    // Not from user input, assume safe
    return true;
  }

  // `res.redirect(isTrustedRedirect(target) ? target : '/')` — the guard is the
  // ternary's test, which the sibling-statement text scan below never looks at.
  // Only a guard we can *prove* anchors the whole origin counts; the same shape
  // over `/https?:\/\/example\.com/` (no `^…$`, unescaped dot) stays reported,
  // which is the entire difference between the two corpus fixtures.
  if (
    target.type === 'ConditionalExpression' &&
    isAnchoredHostGuard(target.test, sourceCode)
  ) {
    return true;
  }

  // Look for validation patterns in the surrounding code
  // This is a simplified static analysis - in practice, would need data flow analysis

  const program = sourceCode.ast;
  const nodeStart = node.loc?.start;
  const nodeEnd = node.loc?.end;

  if (!nodeStart || !nodeEnd || !program) {
    return false;
  }

  // Check for validation function calls before this redirect
  const validationPatterns = [
    /\b(validateUrl|validateRedirect|isValidUrl|isSafeUrl)\s*\(/,
    /\b(whitelist|allowedDomains|permittedUrls|ALLOWED_\w+)\s*\./,
    /\b(url\.hostname|url\.host)\s*===/,
    /\b\w+\.(includes|has)\s*\(/,  // Generic allowlist check: arr.includes(x) or set.has(x)
    /\bstartsWith\s*\(\s*['"]/,
    /\bendsWith\s*\(\s*['"]/,
    /\bindexOf\s*\(\s*['"]/,
    /\bmatch\s*\(\s*\//,
  ];

  // Look for validation in the same function scope
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 20;

  while (current && depth < maxDepth) {
    // Check siblings before this node
    const parent: TSESTree.Node | undefined = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    if (!parent) break;

    if (parent.type === 'BlockStatement' || parent.type === 'Program') {
      const body = parent.body;
      const currentIndex = body.indexOf(current as TSESTree.Statement);

      // Check previous statements in the same block
      for (let i = currentIndex - 1; i >= 0 && i >= currentIndex - 5; i--) {
        const stmt = body[i];
        const stmtText = sourceCode.getText(stmt);

        if (validationPatterns.some(pattern => pattern.test(stmtText))) {
          return true; // Found validation
        }
      }
    }

    // Check if inside an if-block with validation in the condition
    // e.g., if (isValidUrl(redirect)) { res.redirect(redirect); }
    if (parent.type === 'IfStatement' && parent.test) {
      if (isAnchoredHostGuard(parent.test, sourceCode)) {
        return true; // The guard provably pins the whole origin
      }
      const testText = sourceCode.getText(parent.test);
      if (validationPatterns.some(pattern => pattern.test(testText))) {
        return true; // Validation is the if-condition
      }
    }

    current = parent;
    depth++;
  }

  // No validation found
  return false;
}

export const noInsecureRedirects = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-redirects',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-insecure-redirects.md',
      description: 'Detects open redirect vulnerabilities',
      cwe: 'CWE-601',
      cvss: 6.1,
    },
    messages: {
      insecureRedirect: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Open redirect',
        cwe: 'CWE-601',
        description: 'Unvalidated redirect detected - user-controlled URL',
        severity: 'HIGH',
        fix: 'Whitelist allowed domains or validate redirect target',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Unvalidated_Redirects_and_Forwards',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          allowedDomains: {
            type: 'array',
            items: { type: 'string' },
            default: [], description: 'Redirect target domains treated as safe'
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      allowedDomains: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true 
}: Options = options || {};

    const filename = context.filename;
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    /**
     * Check redirect calls and assignments
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check for res.redirect, location.assign/replace, etc.
      if (!isNavigationSink(node)) {
        return;
      }
      // Check if redirect URL is validated
      if (!isRedirectValidated(node, sourceCode)) {
        context.report({
          node,
          messageId: 'insecureRedirect',
        });
      }
    }

    /**
     * Check assignment expressions like window.location.href = ...
     */
    function checkAssignmentExpression(node: TSESTree.AssignmentExpression) {
      // Check for window.location.href assignments
      if (node.left.type === 'MemberExpression' &&
          node.left.object.type === 'MemberExpression' &&
          node.left.object.object.type === 'Identifier' &&
          node.left.object.object.name === 'window' &&
          node.left.object.property.type === 'Identifier' &&
          node.left.object.property.name === 'location' &&
          node.left.property.type === 'Identifier' &&
          ['href', 'replace', 'assign'].includes(node.left.property.name)) {

        // Check if assignment value comes from user input. Same AST test as
        // the call path — a `window.location` mentioned on the LEFT of the
        // assignment is the sink, and says nothing about the value.
        if (isAttackerSteerableUrl(node.right, sourceCode)) {
          context.report({
            node,
            messageId: 'insecureRedirect',
          });
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
      AssignmentExpression: checkAssignmentExpression,
    };
  },
});

