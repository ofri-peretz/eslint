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
import { constInitializerOf } from '../../utils/const-value';

// `useRandomBytes` used to sit here too: an INFO message with a fix string, on
// a rule declaring `hasSuggestions: false` and calling `context.report` with no
// `suggest` array. Nothing could ever have emitted it, and the advice it
// carried ("Generate IV dynamically using crypto.randomBytes(16)") is already
// the `fix:` line of `staticIv`. Deleted rather than wired, since there is no
// report path to restore — there never was one.
type MessageIds = 'staticIv';

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-static-iv.md',
      description: 'Disallow static or hardcoded initialization vectors (IVs)',
      cwe: 'CWE-329',
      cvss: 7.5,
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

    /**
     * Judge the IV, reporting at `site` — the node the reader is looking at.
     *
     * `value` and `site` differ when the IV is held in a `const`: the evidence
     * lives at the declaration, the finding belongs at the `createCipheriv`
     * call. Hoisting the IV to a constant is the *normal* way this bug is
     * written, and until this hop existed the rule was silent on it. The old
     * code even said so, in an empty `if (ivArg.type === Identifier)` block
     * whose comment read "we don't report variables as we can't always
     * determine their source" — a defect described rather than fixed. We can
     * determine the source whenever it is a single-assignment `const`, and the
     * cases where we cannot still fall through silently.
     */
    function checkIvValue(value: TSESTree.Node, site: TSESTree.Node) {
      // Check for string literal IV
      if (value.type === AST_NODE_TYPES.Literal && typeof value.value === 'string') {
        const text = value.value;
        if (STATIC_IV_PATTERNS.some(p => p.test(text)) || text.length >= 8) {
          reportStaticIv(site);
        }
      }

      // Check for Buffer.from('static')
      if (
        value.type === AST_NODE_TYPES.CallExpression &&
        value.callee.type === AST_NODE_TYPES.MemberExpression &&
        value.callee.object.type === AST_NODE_TYPES.Identifier &&
        value.callee.object.name === 'Buffer' &&
        value.callee.property.type === AST_NODE_TYPES.Identifier &&
        (value.callee.property.name === 'from' || value.callee.property.name === 'alloc')
      ) {
        const firstArg = value.arguments[0];
        if (firstArg?.type === AST_NODE_TYPES.Literal && typeof firstArg.value === 'string') {
          reportStaticIv(site);
        }
        // Check for new Uint8Array([...])
        if (firstArg?.type === AST_NODE_TYPES.ArrayExpression) {
          const allLiterals = firstArg.elements.every(
            (el: TSESTree.Expression | TSESTree.SpreadElement | null): boolean => el?.type === AST_NODE_TYPES.Literal && typeof el.value === 'number'
          );
          if (allLiterals) {
            reportStaticIv(site);
          }
        }
      }
    }

    function checkIvArgument(ivArg: TSESTree.CallExpressionArgument) {
      if (ivArg.type === AST_NODE_TYPES.Identifier) {
        // `const iv = crypto.randomBytes(16)` resolves to a call this function
        // does not recognise as static, so the randomBytes case needs no
        // special-casing here — it simply produces no evidence.
        const init = constInitializerOf(context.sourceCode, ivArg);
        if (init !== null) checkIvValue(init, ivArg);
        return;
      }
      checkIvValue(ivArg, ivArg);
    }

    function reportStaticIv(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'staticIv',
      });
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

export type { Options as NoStaticIvOptions };
