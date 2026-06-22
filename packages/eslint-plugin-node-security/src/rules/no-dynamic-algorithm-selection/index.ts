/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License.
 */

/**
 * ESLint Rule: no-dynamic-algorithm-selection
 * CWE-327: Use of a Broken or Risky Cryptographic Algorithm
 *
 * Detects crypto.createHash(), crypto.createCipheriv(), crypto.createSign(),
 * and similar Node crypto APIs where the algorithm name comes from a dynamic
 * value (variable, request param, config value) rather than a literal string.
 *
 * An attacker who controls the algorithm parameter can:
 * - Downgrade to a weak algorithm (MD5, SHA1, RC4)
 * - Cause a crash with an unsupported algorithm name
 * - Bypass security controls that assume a strong algorithm is in use
 *
 * Detection: structural-api.
 *   crypto.createHash(req.query.algo)  → fires (dynamic first arg)
 *   crypto.createHash('sha256')         → silent (literal, checked separately)
 *   crypto.createHash(`sha256`)         → silent (static template)
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'dynamicAlgorithm';

/** Node crypto functions whose first argument is the algorithm name. */
const CRYPTO_ALGORITHM_FUNCTIONS = new Set([
  'createHash',
  'createHmac',
  'createSign',
  'createVerify',
  'createCipher',
  'createCipheriv',
  'createDecipher',
  'createDecipheriv',
]);

export const noDynamicAlgorithmSelection = createRule<[], MessageIds>({
  name: 'no-dynamic-algorithm-selection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-dynamic-algorithm-selection.md',
      description:
        'Disallow dynamic algorithm names in Node.js crypto functions (CWE-327)',
      cwe: 'CWE-327',
      // Match the CVSS the finding emits: the message sets no per-message
      // cvss, so it inherits CWE_MAPPING['CWE-327'] (7.5) via enrichFromCWE.
      // Locked by security-cvss-docs-consistency.lock.test.ts.
      cvss: 7.5,
    },
    messages: {
      dynamicAlgorithm: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic Cryptographic Algorithm (CWE-327)',
        cwe: 'CWE-327',
        description:
          '`crypto.{{method}}()` receives a dynamic algorithm name. An attacker who controls this value can downgrade to a weak algorithm (MD5, SHA1, RC4) or cause a crash.',
        severity: 'HIGH',
        fix: 'Hard-code the algorithm name as a literal string (e.g. "sha256", "aes-256-gcm"). Use an allowlist if the algorithm must vary at runtime.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const { callee, arguments: args } = node;

        // Match crypto.method(algo) — MemberExpression where object is 'crypto'
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (callee.object.type !== AST_NODE_TYPES.Identifier) return;
        if (callee.property.type !== AST_NODE_TYPES.Identifier) return;

        const objectName = callee.object.name;
        const methodName = callee.property.name;

        if (objectName !== 'crypto') return;
        if (!CRYPTO_ALGORITHM_FUNCTIONS.has(methodName)) return;

        const firstArg = args[0];
        if (!firstArg) return;

        // String literal → already handled by no-weak-hash-algorithm for weak algos;
        // a literal is always an intentional, auditable choice.
        if (
          firstArg.type === AST_NODE_TYPES.Literal &&
          typeof (firstArg as TSESTree.Literal).value === 'string'
        ) return;

        // Template literal without expressions → equivalent to literal, safe.
        if (
          firstArg.type === AST_NODE_TYPES.TemplateLiteral &&
          (firstArg as TSESTree.TemplateLiteral).expressions.length === 0
        ) return;

        context.report({
          node: firstArg,
          messageId: 'dynamicAlgorithm',
          data: { method: methodName },
        });
      },
    };
  },
});
