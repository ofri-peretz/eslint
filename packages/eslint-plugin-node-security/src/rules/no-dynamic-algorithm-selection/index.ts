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
 * Detection: structural-api, plus a same-file constant fold.
 *   crypto.createHash(req.query.algo)  → fires (dynamic first arg)
 *   crypto.createHash('sha256')         → silent (literal, checked separately)
 *   crypto.createHash(`sha256`)         → silent (static template)
 *   crypto.createHash(algo)             → silent when `algo` folds to a literal
 *
 * ## Why folding, and not just "is it a literal at the call site"
 *
 * `Shopify/cli` `packages/eslint-plugin-cli/rules/no-inline-graphql.js:44`:
 *
 * ```js
 * function hashFileSync(filePath, algorithm = 'sha256') {
 *   const hash = crypto.createHash(algorithm)
 * ```
 *
 * `hashFileSync` is a file-local helper and its one call site passes a single
 * argument, so `algorithm` is the literal `'sha256'` on every execution. There
 * is no downgrade to be had: the parameter is never supplied by anyone. The
 * rule reported it anyway, because it asked what the argument LOOKS like rather
 * than what it can BE.
 *
 * Two resolutions are now attempted before reporting, both in
 * `utils/constant-folding` and both same-file only:
 *   1. the argument folds to a literal (`const` binding, ternary, `for…of` row);
 *   2. the argument is a parameter whose default is a literal and whose function
 *      is never called with an argument in that position, and never escapes.
 *
 * Everything else still reports. An unresolved algorithm name is unresolved,
 * not safe.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';

import {
  makeIsLiteralConstant,
  parameterIsAlwaysDefault,
} from '../../utils/constant-folding';

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
    const sourceCode = context.sourceCode;
    const isLiteralConstant = makeIsLiteralConstant(sourceCode);

    /**
     * Can this algorithm name be anything other than a literal in this file?
     *
     * Scope references are complete before any rule visitor runs, so the call
     * sites a parameter default depends on are all visible here — no
     * `Program:exit` deferral is needed.
     */
    const resolvesToLiteral = (node: TSESTree.Node): boolean => {
      if (isLiteralConstant(node)) return true;
      return (
        node.type === AST_NODE_TYPES.Identifier &&
        parameterIsAlwaysDefault(sourceCode, node, isLiteralConstant)
      );
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const { callee, arguments: args } = node;

        // Match crypto.method(algo) — MemberExpression where object is 'crypto'
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (callee.object.type !== AST_NODE_TYPES.Identifier) return;
        // `crypto['createHash'](algo)` selects the algorithm the same way.
        const methodName = propertyName(callee);
        if (methodName === null) return;

        const objectName = callee.object.name;

        if (objectName !== 'crypto') return;
        if (!CRYPTO_ALGORITHM_FUNCTIONS.has(methodName)) return;

        const firstArg = args[0];
        if (!firstArg) return;

        // A literal at the call site, a `const` that folds to one, or a
        // parameter default no caller overrides — all the same fact: the
        // algorithm is an intentional, auditable choice written in this file.
        // Weak literal choices are `no-weak-hash-algorithm`'s job, not this
        // rule's; this one is only about who gets to pick.
        if (resolvesToLiteral(firstArg)) return;

        context.report({
          node: firstArg,
          messageId: 'dynamicAlgorithm',
          data: { method: methodName },
        });
      },
    };
  },
});
