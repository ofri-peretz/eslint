/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-bypass-middleware
 * Prevents bypassing Mongoose middleware
 * CWE-284: Improper Access Control
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  propertyName,
} from '@interlace/eslint-devkit';
import { analyzeMongoScope } from '../../utils/receiver';
import {
  fileUsesMongoose,
  isNativeCollectionHandle,
} from '../../utils/mongo-evidence';

type MessageIds = 'bypassMiddleware';
export interface Options {
  allowInTests?: boolean;
}
type RuleOptions = [Options?];

const BYPASS_METHODS = new Set([
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'findByIdAndUpdate',
  'findByIdAndDelete',
  'insertMany',
  'bulkWrite',
]);

export const noBypassMiddleware = createRule<RuleOptions, MessageIds>({
  name: 'no-bypass-middleware',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-bypass-middleware.md',
      description: 'Prevent bypassing Mongoose pre/post middleware hooks',
      cwe: 'CWE-284',
      cvss: 5.3,
    },
    messages: {
      bypassMiddleware: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Middleware Bypass',
        cwe: 'CWE-284',
        owasp: 'A01:2021',
        cvss: 5.3,
        description: 'This method bypasses Mongoose middleware hooks',
        severity: 'MEDIUM',
        fix: 'Use findOne + save() pattern to ensure middleware runs',
        documentationLink: 'https://mongoosejs.com/docs/middleware.html',
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
    let mongo: ReturnType<typeof analyzeMongoScope>;

    return {
      before() {
        // Middleware is a Mongoose feature. The file-level question this rule
        // has to ask is "is Mongoose in play", not "is MongoDB": a file that
        // only drives the native `mongodb` package has no `pre('updateOne')`
        // hook to bypass, and `db.collection('apps').updateOne(...)` in such a
        // file was 301 findings on one app that wraps the driver.
        // Registering no visitors is both the gate and the cheap path.
        if (!fileUsesMongoose(context.sourceCode.ast)) return false;

        const [options = {}] = context.options;
        const { allowInTests = true } = options as Options;
        const filename = context.filename;
        const inTestFile = isTestFilePath(filename);

        if (allowInTests && inTestFile) {
          return false;
        }

        mongo = analyzeMongoScope(context.sourceCode.ast);
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        // `User['updateOne'](...)` calls the same method the dotted form does.
        const methodName = propertyName(node.callee);

        // `updateOne`/`findOneAndDelete` are also the vocabulary of every
        // generic repository wrapper. Only a Mongoose model has middleware to
        // bypass in the first place.
        if (
          methodName &&
          BYPASS_METHODS.has(methodName) &&
          mongo.isModelReceiver(node)
        ) {
          // `connection.collection('x').updateOne()` hands back the driver's
          // own collection, even in a file that also uses Mongoose models:
          // there is no middleware on that object to bypass.
          if (isNativeCollectionHandle(node.callee.object)) return;
          context.report({
            node,
            messageId: 'bypassMiddleware',
          });
        }
      },
    };
  },
});

export default noBypassMiddleware;
