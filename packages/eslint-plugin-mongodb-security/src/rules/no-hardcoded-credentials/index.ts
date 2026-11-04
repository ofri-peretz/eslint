/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-hardcoded-credentials
 * Detects hardcoded MongoDB auth credentials in connection options
 * CWE-798: Hardcoded Credentials
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';
import { fileUsesMongo } from '../../utils/mongo-evidence';

type MessageIds = 'hardcodedCredentials';
export interface Options {
  allowInTests?: boolean;
}
type RuleOptions = [Options?];

const CREDENTIAL_KEYS = new Set([
  'user',
  'username',
  'pass',
  'password',
  'auth',
]);

/**
 * Credential keys that only IDENTIFY an account. In connection options they
 * are half of a login; in a query filter or an update they are the value
 * being looked up or written (`User.findOne({ username: 'admin' })`), not a
 * secret. `pass` / `password` are secrets wherever they are written.
 */
const IDENTITY_KEYS = new Set(['user', 'username', 'auth']);

/**
 * The MongoDB / Mongoose operations whose object arguments are query
 * filters, update documents or aggregation pipelines: data, never the
 * options a connection authenticates with.
 */
const DATA_OPERATIONS = new Set([
  'find',
  'findOne',
  'findById',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'findByIdAndUpdate',
  'findByIdAndDelete',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'replaceOne',
  'countDocuments',
  'distinct',
  'exists',
  'aggregate',
]);

/** Is `call` a data operation (`x.findOne(…)`, `x['aggregate'](…)`)? */
function isDataOperation(call: TSESTree.CallExpression): boolean {
  const callee = call.callee;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  const name = propertyName(callee);
  return name !== null && DATA_OPERATIONS.has(name);
}

/** Is `node` an argument of a data operation? */
function isDataArgument(node: TSESTree.Node): boolean {
  const parent = node.parent;
  return (
    parent?.type === AST_NODE_TYPES.CallExpression &&
    parent.arguments.some((argument) => argument === node) &&
    isDataOperation(parent)
  );
}

export const noHardcodedCredentials = createRule<RuleOptions, MessageIds>({
  name: 'no-hardcoded-credentials',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-hardcoded-credentials.md',
      description: 'Prevent hardcoded MongoDB authentication credentials',
      cwe: 'CWE-798',
      cvss: 7.5,
    },
    messages: {
      hardcodedCredentials: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Credentials',
        cwe: 'CWE-798',
        cvss: 7.5,
        description: 'MongoDB authentication credentials are hardcoded',
        severity: 'HIGH',
        fix: 'Use environment variables for username and password',
        documentationLink: 'https://cwe.mitre.org/data/definitions/798.html',
      }),
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
    /**
     * Does this property sit in a query filter, update document or pipeline
     * stage: written inline in a data operation's arguments (through nested
     * objects and arrays), or bound to a `const` that is passed to one?
     */
    const inDataDocument = (property: TSESTree.Property): boolean => {
      let top: TSESTree.Node = property.parent;
      for (;;) {
        const up: TSESTree.Node | undefined = top.parent;
        if (up?.type === AST_NODE_TYPES.ArrayExpression) top = up;
        else if (up?.type === AST_NODE_TYPES.Property && up.value === top)
          top = up.parent;
        else break;
      }
      if (isDataArgument(top)) return true;
      const declarator = top.parent;
      if (
        declarator?.type !== AST_NODE_TYPES.VariableDeclarator ||
        declarator.init !== top
      ) {
        return false;
      }
      // Every use must be a data operation: the same object also handed to
      // `create()` or exported is not only a filter.
      return context.sourceCode
        .getDeclaredVariables(declarator)
        .some((variable) => {
          const uses = variable.references.filter(
            (reference) => !reference.init,
          );
          return (
            uses.length > 0 &&
            uses.every((reference) => isDataArgument(reference.identifier))
          );
        });
    };

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
      Property(node: TSESTree.Property) {
        const keyName =
          node.key.type === AST_NODE_TYPES.Identifier
            ? node.key.name
            : node.key.type === AST_NODE_TYPES.Literal
              ? String(node.key.value)
              : null;

        if (!keyName || !CREDENTIAL_KEYS.has(keyName.toLowerCase())) {
          return;
        }
        if (IDENTITY_KEYS.has(keyName.toLowerCase()) && inDataDocument(node)) {
          return;
        }

        const staticText = staticString(node.value);
        if (staticText !== null) {
          if (staticText.length > 0) {
            context.report({
              node,
              messageId: 'hardcodedCredentials',
            });
          }
        }
      },
    };
  },
});

export default noHardcodedCredentials;
