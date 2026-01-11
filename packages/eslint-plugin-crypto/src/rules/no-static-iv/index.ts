/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-static-iv
 * Detects use of hardcoded or reused initialization vectors (IVs)
 * CWE-329: Not Using an Unpredictable IV with CBC Mode
 *
 * @see https://cwe.mitre.org/data/definitions/329.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'staticIv'
  | 'useRandomBytes';

export interface Options {
  /** Allow static IVs in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Patterns that indicate a hardcoded IV
 */
const STATIC_IV_PATTERNS = [
  /^[0-9a-f]+$/i,  // Hex string
  /^[A-Za-z0-9+/]+=*$/,  // Base64
];

export const noStaticIv = createRule<RuleOptions, MessageIds>({
  name: 'no-static-iv',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow static or hardcoded initialization vectors (IVs)',
    },
    hasSuggestions: false,
    messages: {
      staticIv: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Static IV detected',
        cwe: 'CWE-329',
        description: 'Hardcoded IV detected. Using static IVs makes encryption deterministic, allowing attackers to detect repeated plaintexts.',
        severity: 'HIGH',
        fix: 'Generate IV dynamically using crypto.randomBytes(16)',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#initialization-vectors',
      }),
      useRandomBytes: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use randomBytes',
        description: 'Generate IV dynamically for each encryption operation',
        severity: 'LOW',
        fix: 'const iv = crypto.randomBytes(16);',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptorandombytessize-callback',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow static IVs in test files',
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
    [options = {}]
  ) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    // Track variables assigned from randomBytes
    const randomIvVariables = new Set<string>();

    function checkVariableDeclarator(node: TSESTree.VariableDeclarator) {
      // Track: const iv = crypto.randomBytes(16)
      if (
        node.id.type === AST_NODE_TYPES.Identifier &&
        node.init?.type === AST_NODE_TYPES.CallExpression
      ) {
        const init = node.init;
        if (
          init.callee.type === AST_NODE_TYPES.MemberExpression &&
          init.callee.property.type === AST_NODE_TYPES.Identifier &&
          init.callee.property.name === 'randomBytes'
        ) {
          randomIvVariables.add(node.id.name);
        }
        /* c8 ignore next 4 -- standalone randomBytes call requires specific import pattern */
        if (
          init.callee.type === AST_NODE_TYPES.Identifier &&
          init.callee.name === 'randomBytes'
        ) {
          randomIvVariables.add(node.id.name);
        }
      }
    }

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) return;

      // Check for createCipheriv calls
      const isCipherivCall =
        (node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.callee.property.name === 'createCipheriv' || node.callee.property.name === 'createDecipheriv')) ||
        (node.callee.type === AST_NODE_TYPES.Identifier &&
          (node.callee.name === 'createCipheriv' || node.callee.name === 'createDecipheriv'));

      if (isCipherivCall && node.arguments.length >= 3) {
        const ivArg = node.arguments[2];
        checkIvArgument(ivArg);
      }
    }

    function checkIvArgument(ivArg: TSESTree.CallExpressionArgument) {
      // Check for string literal IV
      if (ivArg.type === AST_NODE_TYPES.Literal && typeof ivArg.value === 'string') {
        const value = ivArg.value;
        if (STATIC_IV_PATTERNS.some(p => p.test(value)) || value.length >= 8) {
          reportStaticIv(ivArg);
        }
      }

      // Check for Buffer.from('static')
      if (
        ivArg.type === AST_NODE_TYPES.CallExpression &&
        ivArg.callee.type === AST_NODE_TYPES.MemberExpression &&
        ivArg.callee.object.type === AST_NODE_TYPES.Identifier &&
        ivArg.callee.object.name === 'Buffer' &&
        ivArg.callee.property.type === AST_NODE_TYPES.Identifier &&
        (ivArg.callee.property.name === 'from' || ivArg.callee.property.name === 'alloc')
      ) {
        const firstArg = ivArg.arguments[0];
        if (firstArg?.type === AST_NODE_TYPES.Literal && typeof firstArg.value === 'string') {
          reportStaticIv(ivArg);
        }
        /* c8 ignore next 7 -- ArrayExpression with all numeric literals is rare pattern */
        // Check for new Uint8Array([...])
        if (firstArg?.type === AST_NODE_TYPES.ArrayExpression) {
          const allLiterals = firstArg.elements.every(
            (el: TSESTree.Expression | TSESTree.SpreadElement | null): boolean => el?.type === AST_NODE_TYPES.Literal && typeof el.value === 'number'
          );
          if (allLiterals) {
            reportStaticIv(ivArg);
          }
        }
      }

      // Check for variable reference that's NOT from randomBytes
      if (ivArg.type === AST_NODE_TYPES.Identifier) {
        // If we've tracked this variable as coming from randomBytes, it's OK
        // Otherwise, we can't be sure - only flag if we have evidence it's static
        // For now, we don't report variables as we can't always determine their source
      }
    }

    function reportStaticIv(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'staticIv',
      });
    }

    return {
      VariableDeclarator: checkVariableDeclarator,
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoStaticIvOptions };
