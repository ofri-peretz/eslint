/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-ecb-mode
 * Detects use of ECB encryption mode which leaks data patterns
 * CWE-327: ECB mode encrypts identical blocks identically
 *
 * @see https://blog.cloudflare.com/why-are-some-images-more-secure-than-others/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  isTestFilePath,
} from '@interlace/eslint-devkit';
import { resolveConstantString } from '../../utils/const-value';
import { calleeNameOn } from '../../utils/module-binding';

type MessageIds = 'ecbMode' | 'useGcm' | 'useCbc';

export interface Options {
  /** Allow ECB in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noEcbMode = createRule<RuleOptions, MessageIds>({
  name: 'no-ecb-mode',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-ecb-mode.md',
      description: 'Disallow ECB encryption mode (use GCM or CBC instead)',
      cwe: 'CWE-327',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      ecbMode: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'ECB mode detected',
        cwe: 'CWE-327',
        description:
          'ECB mode encrypts identical plaintext blocks to identical ciphertext, leaking data patterns. Famous example: the "ECB penguin".',
        severity: 'HIGH',
        fix: 'Use GCM mode for authenticated encryption: crypto.createCipheriv("aes-256-gcm", key, iv)',
        documentationLink:
          'https://blog.cloudflare.com/why-are-some-images-more-secure-than-others/',
      }),
      useGcm: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use GCM mode',
        description:
          'GCM provides authenticated encryption (confidentiality + integrity)',
        severity: 'LOW',
        fix: 'crypto.createCipheriv("aes-256-gcm", key, iv)',
        documentationLink:
          'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
      useCbc: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use CBC mode',
        description:
          'CBC with HMAC provides confidentiality (add separate MAC for integrity)',
        severity: 'LOW',
        fix: 'crypto.createCipheriv("aes-256-cbc", key, iv)',
        documentationLink:
          'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow ECB mode in test files',
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let isTestFile: boolean;

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;

      const cipherMethods = new Set([
        'createCipher',
        'createCipheriv',
        'createDecipher',
        'createDecipheriv',
      ]);

      // Check for crypto.createCipher*() pattern — under any binding:
      // `import { createCipheriv as makeCipher }` is still createCipheriv.
      const calleeName = calleeNameOn(
        node.callee,
        context.sourceCode.getScope(node),
        'crypto',
      );
      const isCipherCall = calleeName !== null && cipherMethods.has(calleeName);

      if (isCipherCall && node.arguments.length >= 1) {
        const algorithmArg = node.arguments[0];
        // `const MODE = 'aes-256-ecb'; createCipheriv(MODE, …)` is still ECB.
        // Matching only an inline literal made a module constant a silencer —
        // see `utils/const-value`.
        const resolved = resolveConstantString(
          context.sourceCode,
          algorithmArg,
        );
        if (resolved === null) return;
        const algorithm = resolved.value.toLowerCase();
        // Every ECB name in `crypto.getCiphers()` carries the `-ecb` segment
        // (`aes-256-ecb`, `des-ede3-ecb`, `sm4-ecb`), so no bare-suffix check.
        if (algorithm.includes('-ecb')) {
          const gcmReplacement = algorithm.replace(/-?ecb$/, '-gcm');
          // Report at the call site; rewrite whichever node holds the string.
          const target = resolved.source;

          context.report({
            node: algorithmArg,
            messageId: 'ecbMode',
            suggest: [
              {
                messageId: 'useGcm',
                fix: (fixer: TSESLint.RuleFixer) => {
                  return fixer.replaceText(target, `"${gcmReplacement}"`);
                },
              },
              {
                messageId: 'useCbc',
                fix: (fixer: TSESLint.RuleFixer) => {
                  const cbcReplacement = algorithm.replace(/-?ecb$/, '-cbc');
                  return fixer.replaceText(target, `"${cbcReplacement}"`);
                },
              },
            ],
          });
        }
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        const { allowInTests = false } = options as Options;

        const filename = context.filename;
        isTestFile = allowInTests && isTestFilePath(filename);
      },
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoEcbModeOptions };
