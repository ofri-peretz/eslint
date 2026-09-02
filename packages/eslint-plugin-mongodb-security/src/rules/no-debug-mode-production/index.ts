/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-debug-mode-production
 * Prevents Mongoose debug mode in production
 * CWE-489: Active Debug Code
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons, isTestFilePath, propertyName } from '@interlace/eslint-devkit';
import { fileUsesMongo } from '../../utils/mongo-evidence';

type MessageIds = 'debugModeProduction' | 'suggestionGateOnNodeEnv';
export interface Options { allowInTests?: boolean; }
type RuleOptions = [Options?];

export const noDebugModeProduction = createRule<RuleOptions, MessageIds>({
  name: 'no-debug-mode-production',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-debug-mode-production.md', description: 'Prevent Mongoose debug mode in production',
      cwe: 'CWE-489',
      cvss: 3.1,
    },
    hasSuggestions: true,
    messages: {
      debugModeProduction: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Debug Mode in Production',
        cwe: 'CWE-489',
        owasp: 'A05:2021',
        cvss: 3.1,
        description: 'mongoose.set("debug", true) exposes query details in production',
        severity: 'LOW',
        fix: 'Use mongoose.set("debug", process.env.NODE_ENV !== "production")',
        documentationLink: 'https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.set()',
      }),
      suggestionGateOnNodeEnv: "Gate debug mode on process.env.NODE_ENV !== 'production'",
    },
    schema: [{ type: 'object', properties: { allowInTests: { type: 'boolean', default: true } }, additionalProperties: false }],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Every rule here is MongoDB-specific, and none of them could ask the
    // file-level question: over the corpus, 47% of this plugin's findings were
    // in files with no Mongo in them. `receiver.ts` discriminates by receiver
    // NAME, which matches `userModel.findOne()` in a TypeORM repository just as
    // well as in a Mongoose one. Registering no visitors is both the gate and
    // the cheap path.
    if (!fileUsesMongo(context.sourceCode.ast)) return {};

    const [options = {}] = context.options;
    const { allowInTests = true } = options as Options;
    const filename = context.filename;
    const inTestFile = isTestFilePath(filename);

    if (allowInTests && inTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(node.callee) === 'set' &&
          node.arguments.length >= 2
        ) {
          const firstArg = node.arguments[0];
          const secondArg = node.arguments[1];

          if (
            firstArg.type === AST_NODE_TYPES.Literal &&
            firstArg.value === 'debug' &&
            secondArg.type === AST_NODE_TYPES.Literal &&
            secondArg.value === true
          ) {
            context.report({
              node,
              messageId: 'debugModeProduction',
              suggest: [
                {
                  messageId: 'suggestionGateOnNodeEnv',
                  fix: (fixer: TSESLint.RuleFixer) =>
                    fixer.replaceText(secondArg, "process.env.NODE_ENV !== 'production'"),
                },
              ],
            });
          }
        }
      },
    };
  },
});

export default noDebugModeProduction;
