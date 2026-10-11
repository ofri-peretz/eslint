/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-hardcoded-secret
 *
 * Detects hardcoded secrets in JWT sign/verify operations.
 * Hardcoded secrets in source code are a critical security vulnerability.
 *
 * CWE-798: Use of Hard-coded Credentials
 *
 * @see https://cwe.mitre.org/data/definitions/798.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import {
  isPublicKeyMaterial,
  isSignOperation,
  isSignatureVerifyOperation,
  jwtConfigOf,
  keyLiterals,
  keyNodesOf,
} from '../../utils';
import type { NoHardcodedSecretOptions } from '../../types';

type MessageIds = 'hardcodedSecret' | 'useEnvVariable';

type RuleOptions = [NoHardcodedSecretOptions?];

export const noHardcodedSecret = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-secret',
  /**
   * A test that signs a fixture token with `'test-secret'` is not shipping a
   * credential. Matches `require-expiration` and `no-decode-without-verify`,
   * which skip test files for the same reason.
   */
  skipTestFiles: true,
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-jwt-security/docs/rules/no-hardcoded-secret.md',
      description: 'Disallow hardcoded secrets in JWT sign/verify operations',
      cwe: 'CWE-798',
      cvss: 9.8,
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      hardcodedSecret: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded JWT Secret',
        cwe: 'CWE-798',
        description:
          'Secret key hardcoded in source code can be extracted from repositories',
        severity: 'HIGH',
        fix: 'Use process.env.JWT_SECRET or secure secret management',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
      useEnvVariable: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Environment Variable',
        description: 'Replace hardcoded secret with environment variable',
        severity: 'LOW',
        fix: 'process.env.JWT_SECRET',
        documentationLink: 'https://12factor.net/config',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          envPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Patterns that indicate safe environment variable usage',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          strictMode: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      envPatterns: [],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const sourceCode = context.sourceCode;

    /**
     * Report each key position that can receive a hardcoded string.
     *
     * `keyLiterals` reads the key STRUCTURALLY: a literal, a same-file const,
     * both arms of `||` / `??` (the `process.env.JWT_SECRET || 'secret'`
     * fallback that ships the literal the moment the variable is unset), and
     * the byte wrappers jose is fed (`new TextEncoder().encode('…')`,
     * `Buffer.from('…')`). An env var, a call, an await, a member read or a
     * parameter yields nothing — there is no literal to point at.
     *
     * PEM PUBLIC key material is skipped: a public key is published on
     * purpose, and pinning an identity provider's verification key is not a
     * CWE-798 credential. A private key PEM is still reported.
     */
    const checkKeys = (keys: TSESTree.Node[]): void => {
      for (const key of keys) {
        const hardcoded = keyLiterals(key, sourceCode).some(
          ({ literal }) => !isPublicKeyMaterial(literal),
        );
        if (hardcoded) {
          // The report points at the key expression — the thing the author
          // has to replace — not at a literal that may sit in a const above.
          context.report({ node: key, messageId: 'hardcodedSecret' });
        }
      }
    };

    /**
     * Config-object APIs: `JwtModule.register({ secret })`,
     * `expressjwt({ secret })`, passport-jwt's `new Strategy({ secretOrKey })`,
     * fast-jwt's `createSigner({ key })`.
     */
    const checkConfig = (
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): boolean => {
      const config = jwtConfigOf(node, sourceCode);
      if (config === null) return false;
      checkKeys(config.keys);
      return true;
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (checkConfig(node)) {
          return;
        }
        // Check both sign and verify operations
        if (
          !isSignOperation(node, sourceCode) &&
          !isSignatureVerifyOperation(node, sourceCode)
        ) {
          return;
        }
        // jose's `.sign(key)`, NestJS's `{ secret }`, or the second argument.
        checkKeys(keyNodesOf(node, sourceCode));
      },
      NewExpression: checkConfig,
    };
  },
});

export default noHardcodedSecret;
