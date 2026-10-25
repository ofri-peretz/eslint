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
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import { fileUsesMongo } from '../../utils/mongo-evidence';

type MessageIds = 'debugModeProduction' | 'suggestionGateOnNodeEnv';
export interface Options {
  allowInTests?: boolean;
}
type RuleOptions = [Options?];

/** The variable a name resolves to, walking outward from `scope`. */
function lookup(
  name: string,
  scope: TSESLint.Scope.Scope,
): TSESLint.Scope.Variable | undefined {
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current !== null;
    current = current.upper
  ) {
    const variable = current.set.get(name);
    if (variable !== undefined) return variable;
  }
  return undefined;
}

/**
 * Is this `.set()` receiver an Express application or router — `express()` /
 * `express.Router()` called directly, or a binding written once from one?
 *
 * Express has an app setting of its own called `debug`, and
 * `app.set('debug', true)` is that, not Mongoose. The rule reported it on any
 * receiver. Only a receiver PROVABLY made by Express is skipped: the factory
 * must resolve to the `express` module through its import, so a local
 * function that happens to be called `express` does not qualify, and an
 * unknown receiver is still reported — `db.set('debug', true)` may well be a
 * Mongoose instance.
 */
function createdByExpress(
  receiver: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  let value = receiver;
  if (value.type === AST_NODE_TYPES.Identifier) {
    const variable = lookup(value.name, scope);
    if (variable === undefined) return false;
    const def = variable.defs[0];
    if (
      def?.type !== 'Variable' ||
      def.node.id.type !== AST_NODE_TYPES.Identifier ||
      def.node.init === null ||
      variable.references.filter((ref) => ref.isWrite()).length !== 1
    ) {
      return false;
    }
    value = def.node.init;
  }
  if (value.type !== AST_NODE_TYPES.CallExpression) return false;
  const binding = resolveModuleBinding(value.callee, scope);
  return (
    binding?.module === 'express' &&
    (binding.path.length === 0 ||
      (binding.path.length === 1 && binding.path[0] === 'Router'))
  );
}

export const noDebugModeProduction = createRule<RuleOptions, MessageIds>({
  name: 'no-debug-mode-production',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-debug-mode-production.md',
      description: 'Prevent Mongoose debug mode in production',
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
        description:
          'mongoose.set("debug", true) exposes query details in production',
        severity: 'LOW',
        fix: 'Use mongoose.set("debug", process.env.NODE_ENV !== "production")',
        documentationLink:
          'https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.set()',
      }),
      suggestionGateOnNodeEnv:
        "Gate debug mode on process.env.NODE_ENV !== 'production'",
    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const isFunction = (node: TSESTree.Node): boolean =>
      node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      node.type === AST_NODE_TYPES.FunctionExpression;

    const report = (node: TSESTree.CallExpression, value: TSESTree.Node) =>
      context.report({
        node,
        messageId: 'debugModeProduction',
        suggest: [
          {
            messageId: 'suggestionGateOnNodeEnv',
            fix: (fixer: TSESLint.RuleFixer) =>
              fixer.replaceText(
                value,
                isFunction(value)
                  ? // Keep the logger; turn it off in production. Mongoose
                    // reads `false` as "debug off".
                    `process.env.NODE_ENV !== 'production' && (${context.sourceCode.getText(value)})`
                  : "process.env.NODE_ENV !== 'production'",
              ),
          },
        ],
      });

    /**
     * `true`, or a function. Mongoose calls a debug FUNCTION for every query
     * with the collection, the method and the query document — the same
     * disclosure `true` makes, routed through the caller's logger. The docs
     * listed `mongoose.set('debug', (coll, method, query) => …)` as incorrect,
     * and the rule never reported it.
     */
    const enablesDebug = (node: TSESTree.Node): boolean =>
      (node.type === AST_NODE_TYPES.Literal && node.value === true) ||
      isFunction(node);

    return {
      before() {
        // Every rule here is MongoDB-specific, and none of them could ask the
        // file-level question: over the corpus, 47% of this plugin's findings were
        // in files with no Mongo in them. `receiver.ts` discriminates by receiver
        // NAME, which matches `userModel.findOne()` in a TypeORM repository just as
        // well as in a Mongoose one. Registering no visitors is both the gate and
        // the cheap path.
        if (!fileUsesMongo(context.sourceCode.ast)) return false;

        const [options = {}] = context.options;
        const { allowInTests = true } = options as Options;
        const filename = context.filename;
        const inTestFile = isTestFilePath(filename);

        if (allowInTests && inTestFile) {
          return false;
        }
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          propertyName(node.callee) !== 'set' ||
          createdByExpress(
            node.callee.object,
            context.sourceCode.getScope(node),
          )
        ) {
          return;
        }
        const [firstArg, secondArg] = node.arguments;

        // `mongoose.set('debug', true)`
        if (
          secondArg &&
          firstArg.type === AST_NODE_TYPES.Literal &&
          firstArg.value === 'debug' &&
          enablesDebug(secondArg)
        ) {
          report(node, secondArg);
          return;
        }

        // `mongoose.set({ debug: true })` — Mongoose also takes an options
        // object, which sets the same option.
        if (firstArg?.type === AST_NODE_TYPES.ObjectExpression) {
          for (const prop of firstArg.properties) {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              objectKeyName(prop) === 'debug' &&
              enablesDebug(prop.value)
            ) {
              report(node, prop.value);
            }
          }
        }
      },
    };
  },
});

export default noDebugModeProduction;
