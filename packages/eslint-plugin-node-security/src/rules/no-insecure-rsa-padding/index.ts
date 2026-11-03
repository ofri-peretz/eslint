/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-rsa-padding
 * Detects RSA with PKCS#1 v1.5 padding (Marvin Attack vulnerable)
 * CVE-2023-46809: Timing side-channel in Node.js privateDecrypt()
 *
 * @see https://nvd.nist.gov/vuln/detail/CVE-2023-46809
 * @see https://people.redhat.com/~hkario/marvin/
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
import { constInitializerOf } from '../../utils/const-value';
import { calleeNameOn } from '../../utils/module-binding';

type MessageIds = 'insecureRsaPadding' | 'useOaep';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Constants for PKCS#1 v1.5 padding (insecure)
/** The numeric value of `crypto.constants.RSA_PKCS1_PADDING`. */
const RSA_PKCS1_PADDING_VALUE = 1;

export const noInsecureRsaPadding = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-rsa-padding',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-insecure-rsa-padding.md',
      description:
        'Disallow RSA PKCS#1 v1.5 padding (CVE-2023-46809 Marvin Attack)',
      cwe: 'CWE-327',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      insecureRsaPadding: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure RSA padding',
        cwe: 'CWE-327',
        description:
          'RSA PKCS#1 v1.5 padding is vulnerable to the Marvin Attack (CVE-2023-46809). Timing side-channels allow attackers to decrypt ciphertexts or forge signatures.',
        severity: 'HIGH',
        fix: 'Use RSA_PKCS1_OAEP_PADDING instead',
        documentationLink: 'https://people.redhat.com/~hkario/marvin/',
      }),
      useOaep: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use OAEP padding',
        description:
          'Use RSA-OAEP which is not vulnerable to padding oracle attacks',
        severity: 'LOW',
        fix: 'padding: crypto.constants.RSA_PKCS1_OAEP_PADDING',
        documentationLink:
          'https://nodejs.org/api/crypto.html#cryptopublicdecryptkey-buffer',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow in test files',
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
    let sourceCode: Readonly<TSESLint.SourceCode>;

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;

      // Check for privateDecrypt, publicDecrypt, privateEncrypt, publicEncrypt
      const rsaMethods = new Set([
        'privateDecrypt',
        'publicDecrypt',
        'privateEncrypt',
        'publicEncrypt',
      ]);

      const calleeName = calleeNameOn(
        node.callee,
        sourceCode.getScope(node),
        'crypto',
      );
      const isRsaCall = calleeName !== null && rsaMethods.has(calleeName);

      if (isRsaCall && node.arguments.length >= 1) {
        // The options object written inline, or hoisted to a `const` in scope
        // — `const opts = { key, padding: … }; privateDecrypt(opts, data)` is
        // the common way to write these calls.
        const written = node.arguments[0];
        const keyArg =
          written.type === AST_NODE_TYPES.Identifier
            ? (constInitializerOf(sourceCode, written) ?? written)
            : written;

        // Check if first argument is an object with padding property
        if (keyArg.type === AST_NODE_TYPES.ObjectExpression) {
          for (const prop of keyArg.properties) {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              objectKeyName(prop) === 'padding'
            ) {
              // `const P = crypto.constants.RSA_PKCS1_PADDING; { padding: P }`
              // hands the call the same constant written inline.
              const padding =
                prop.value.type === AST_NODE_TYPES.Identifier
                  ? (constInitializerOf(sourceCode, prop.value) ?? prop.value)
                  : prop.value;
              const paddingText = sourceCode.getText(padding);
              if (
                // Any spelling of the constant — bare, `constants.`, `crypto.constants.`.
                paddingText.includes('RSA_PKCS1_PADDING') ||
                // `1` IS `crypto.constants.RSA_PKCS1_PADDING`.
                (padding.type === AST_NODE_TYPES.Literal &&
                  padding.value === RSA_PKCS1_PADDING_VALUE)
              ) {
                context.report({
                  node: prop,
                  messageId: 'insecureRsaPadding',
                  suggest: [
                    {
                      messageId: 'useOaep',
                      // A shorthand `{ padding }` has no value of its own
                      // to replace, so the whole property is rewritten.
                      fix: (fixer: TSESLint.RuleFixer) =>
                        prop.shorthand
                          ? fixer.replaceText(
                              prop,
                              'padding: crypto.constants.RSA_PKCS1_OAEP_PADDING',
                            )
                          : fixer.replaceText(
                              prop.value,
                              'crypto.constants.RSA_PKCS1_OAEP_PADDING',
                            ),
                    },
                  ],
                });
              }
            }
          }
        }
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        const { allowInTests = false } = options as Options;

        const filename = context.filename;
        isTestFile = allowInTests && isTestFilePath(filename);

        sourceCode = context.sourceCode;
      },
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoInsecureRsaPaddingOptions };
