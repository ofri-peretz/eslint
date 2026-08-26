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
  staticString,
} from '@interlace/eslint-devkit';
import { isSignOperation, isVerifyOperation, isEnvVariable } from '../../utils';
import type { NoHardcodedSecretOptions } from '../../types';

type MessageIds = 'hardcodedSecret' | 'useEnvVariable';

type RuleOptions = [NoHardcodedSecretOptions?];

export const noHardcodedSecret = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-secret',
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
    /**
     * Check if a node is a hardcoded string literal
     */
    // oxlint-disable-next-line consistent-function-scoping
    // A quoted string and a no-substitution template literal are one thing;
    // `staticString` answers for both, which made the separate template arm
    // that used to sit here unreachable.
    const isHardcodedString = (node: TSESTree.Node): boolean => staticString(node) !== null;

    /**
     * Resolve an Identifier node to its initializer (one frame of indirection).
     * Closes the audit FN where `const SECRET = 'x'; jwt.sign(p, SECRET)`
     * was treated as safe — the literal-via-const pattern hides the
     * hardcoded secret behind one declaration. See benchmarks/AUDIT_PATTERNS.md
     * §3.2 ("Indirection through one level of variable").
     */
    const resolveConstLiteralValue = (
      node: TSESTree.Node,
    ): TSESTree.Node | null => {
      if (node.type !== 'Identifier') return null;
      // `sourceCode.getScope(node)` landed in ESLint 8.37 and this package's
      // declared floor is 8.40, so it is always present — the optional call and
      // null fallback that used to guard it were unreachable branches that no
      // test could cover.
      const scope = context.sourceCode.getScope(node);
      const variable = scope.references.find(
        (r) => r.identifier === node,
      )?.resolved;
      const def = variable?.defs[0];
      if (!def || def.type !== 'Variable') return null;
      const decl = def.parent;
      if (decl?.type !== 'VariableDeclaration' || decl.kind !== 'const')
        return null;
      return def.node.init ?? null;
    };

    /**
     * Check if node is a safe key source
     */
    const isSafeKeySource = (node: TSESTree.Node): boolean => {
      // Environment variable
      if (isEnvVariable(node)) {
        return true;
      }

      // Function call (getSecret(), loadKey(), etc.)
      if (node.type === 'CallExpression') {
        return true;
      }

      // await expression (async key loading)
      if (node.type === 'AwaitExpression') {
        return true;
      }

      // Variable reference: resolve `const X = ...` one level. If X is a
      // hardcoded literal, treat as unsafe — fall through to the
      // hardcoded check. Otherwise (env var, call, identifier chain)
      // it's safe.
      if (node.type === 'Identifier') {
        const init = resolveConstLiteralValue(node);
        if (init && isHardcodedString(init)) {
          // Unsafe — let the caller's `isHardcodedString` (with the
          // resolved init) flag it.
          return false;
        }
        return true;
      }

      // Member expression but not literal (config.secret, etc.)
      if (node.type === 'MemberExpression' && !isHardcodedString(node)) {
        return true;
      }

      return false;
    };

    /**
     * Like isHardcodedString but resolves single-level `const X = '...'`
     * indirection so the caller fires on `const SECRET = 'x'; jwt.sign(p, SECRET)`.
     */
    const isHardcodedStringOrResolvedConst = (node: TSESTree.Node): boolean => {
      if (isHardcodedString(node)) return true;
      const init = resolveConstLiteralValue(node);
      return init ? isHardcodedString(init) : false;
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check both sign and verify operations
        if (!isSignOperation(node) && !isVerifyOperation(node)) {
          return;
        }

        // Secret/key is the second argument
        if (node.arguments.length < 2) {
          return;
        }

        const secretArg = node.arguments[1];

        // Skip if safe source
        if (isSafeKeySource(secretArg)) {
          return;
        }

        // Flag hardcoded strings (also follows single-frame `const X = '...'`).
        if (isHardcodedStringOrResolvedConst(secretArg)) {
          context.report({
            node: secretArg,
            messageId: 'hardcodedSecret',
          });
        }
      },
    };
  },
});

export default noHardcodedSecret;
