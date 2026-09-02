/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-aead-tag-verification
 * Detects AEAD (GCM / CCM / OCB / ChaCha20-Poly1305) decryption that never
 * verifies the authentication tag.
 * CWE-327: Use of a Broken or Risky Cryptographic Algorithm
 *
 * An AEAD mode is only authenticated if BOTH halves of the contract run:
 *
 *   1. `decipher.setAuthTag(tag)` hands the tag to the cipher, and
 *   2. `decipher.final()` is what actually compares it and throws on mismatch.
 *
 * Skip either one and Node happily returns attacker-chosen plaintext from
 * `update()`. The mode still *looks* authenticated — the algorithm string says
 * `aes-256-gcm` — which is precisely why no algorithm-name rule catches it.
 *
 * @see https://cwe.mitre.org/data/definitions/327.html
 * @see https://nodejs.org/api/crypto.html#decipher_setauthtagbuffer
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  isTestFilePath,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingAuthTag' | 'missingFinal';

export interface Options {
  /** Allow unverified AEAD decryption in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Authenticated-encryption modes Node's `crypto` exposes. Matched on the
 * algorithm suffix so key sizes (`aes-128-gcm`, `aes-256-gcm`) and the
 * standalone AEAD stream cipher (`chacha20-poly1305`) all resolve.
 */
const AEAD_SUFFIX = /-(gcm|ccm|ocb|poly1305)$/;

/**
 * Methods that mean the decipher is being driven as a stream rather than with
 * the `update()`/`final()` pair. `pipe`/`end` make Node run `_flush` — which
 * performs the tag check and emits `'error'` — so demanding a literal
 * `.final()` call there would report correct code.
 */
const STREAM_METHODS: ReadonlySet<string> = new Set([
  'pipe',
  'write',
  'end',
  'setEncoding',
]);

export const requireAeadTagVerification = createRule<RuleOptions, MessageIds>({
  name: 'require-aead-tag-verification',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/require-aead-tag-verification.md',
      description:
        'Require AEAD decryption to verify the authentication tag (setAuthTag + final)',
      cwe: 'CWE-327',
      cvss: 7.5,
    },
    hasSuggestions: false,
    messages: {
      missingAuthTag: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AEAD decryption without setAuthTag',
        cwe: 'CWE-327',
        description:
          'An AEAD decipher (GCM/CCM/OCB/ChaCha20-Poly1305) is created but setAuthTag() is never called, so the authentication tag is never checked. Forged or tampered ciphertext decrypts as if it were authentic.',
        severity: 'HIGH',
        fix: 'Call decipher.setAuthTag(tag) with the tag produced at encryption time, then decipher.final()',
        documentationLink:
          'https://nodejs.org/api/crypto.html#decipher_setauthtagbuffer',
      }),
      missingFinal: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AEAD decryption never calls final()',
        cwe: 'CWE-327',
        description:
          'setAuthTag() was called but decipher.final() never is. final() is the call that compares the tag and throws on mismatch — without it the tag is loaded and then ignored, so update() returns unauthenticated plaintext.',
        severity: 'HIGH',
        fix: 'Append decipher.final() to the decryption and let it throw on a tag mismatch',
        documentationLink:
          'https://nodejs.org/api/crypto.html#decipherfinaloutputencoding',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow unverified AEAD decryption in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = false } = options as Options;

    const isTestFile = allowInTests && isTestFilePath(context.filename);

    /** `crypto.createDecipheriv(...)` or a bare `createDecipheriv(...)`. */
    function isCreateDecipheriv(
      callee: TSESTree.CallExpression['callee'],
    ): boolean {
      if (callee.type === AST_NODE_TYPES.MemberExpression) {
        // `crypto['createDecipheriv'](…)` opens the same AEAD decipher.
        return propertyName(callee) === 'createDecipheriv';
      }
      return (
        callee.type === AST_NODE_TYPES.Identifier &&
        callee.name === 'createDecipheriv'
      );
    }

    /**
     * Only a string literal algorithm is evidence. A computed algorithm is
     * `no-dynamic-algorithm-selection`'s finding, not this rule's — guessing
     * here would report code whose mode we cannot read.
     */
    function isAeadAlgorithm(
      argument: TSESTree.CallExpressionArgument | undefined,
    ): boolean {
      return (
        argument !== undefined &&
        argument.type === AST_NODE_TYPES.Literal &&
        typeof argument.value === 'string' &&
        AEAD_SUFFIX.test(argument.value.toLowerCase())
      );
    }

    /**
     * Every method name invoked on the decipher, or `null` when the value
     * escapes to somewhere this rule cannot follow (passed to `pipeline()`,
     * returned, stored on an object, reached through a computed key).
     * Absence of evidence is not evidence of a missing tag check.
     */
    function collectMethods(
      variable: TSESLint.Scope.Variable,
    ): Set<string> | null {
      const methods = new Set<string>();

      for (const reference of variable.references) {
        const identifier = reference.identifier;
        const parent = identifier.parent!;

        // The initialising write — `const decipher = createDecipheriv(…)`.
        if (parent.type === AST_NODE_TYPES.VariableDeclarator) continue;

        if (
          parent.type === AST_NODE_TYPES.MemberExpression &&
          parent.object === identifier &&
          propertyName(parent) !== null
        ) {
          // `decipher['final']()` is the same call in the method set.
          methods.add(propertyName(parent) as string);
          continue;
        }

        return null;
      }

      return methods;
    }

    function checkVariableDeclarator(node: TSESTree.VariableDeclarator) {
      if (isTestFile) return;
      if (node.id.type !== AST_NODE_TYPES.Identifier) return;

      const init = node.init;
      if (!init || init.type !== AST_NODE_TYPES.CallExpression) return;
      if (!isCreateDecipheriv(init.callee)) return;
      if (!isAeadAlgorithm(init.arguments[0])) return;

      const [variable] = context.sourceCode.getDeclaredVariables(node);
      const methods = collectMethods(variable!);
      if (methods === null) return;

      if (!methods.has('setAuthTag')) {
        context.report({ node: init, messageId: 'missingAuthTag' });
        return;
      }

      const drivenAsStream = [...methods].some((name) =>
        STREAM_METHODS.has(name),
      );
      if (!methods.has('final') && !drivenAsStream) {
        context.report({ node: init, messageId: 'missingFinal' });
      }
    }

    return {
      VariableDeclarator: checkVariableDeclarator,
    };
  },
});

export type { Options as RequireAeadTagVerificationOptions };
