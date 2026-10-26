/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-operator-injection
 * Detects potential operator injection attacks ($ne, $gt, $lt, etc.)
 * CWE-943: NoSQL Injection
 *
 * @see https://cwe.mitre.org/data/definitions/943.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  memberPath,
  readsRequestShape,
} from '@interlace/eslint-devkit';
import { fileUsesMongo } from '../../utils/mongo-evidence';

type MessageIds = 'operatorInjection';
export interface Options {
  allowInTests?: boolean;
}
type RuleOptions = [Options?];

const DANGEROUS_OPERATORS = new Set([
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$nin',
  '$not',
  '$nor',
  '$exists',
]);

/**
 * Calls that always return a primitive: `{ $gt: Number(req.query.min) }` is a
 * range query, not an injection. Keyed by the callee's dotted path, so
 * `util.parseInt(x)` — someone else's function — is not one.
 */
const PRIMITIVE_COERCIONS: ReadonlySet<string> = new Set([
  'Number',
  'parseInt',
  'parseFloat',
  'Number.parseInt',
  'Number.parseFloat',
  'String',
]);

type ScopeReader = Parameters<typeof readsRequestShape>[1];

/**
 * Does request input reach this operator value as something that could be an
 * object?
 *
 * This used to search the value's SOURCE TEXT for `'req.body'`, `'req.query'`
 * and friends, so `prereq.bodyCount` — which contains the characters
 * `req.body` — was request input, while Fastify's `(request, reply)` reading
 * `request.query.x` was not. The request is now found the way `no-unsafe-query`
 * finds it: a `.body`/`.query`/`.params`/… read off a function parameter
 * (`readsRequestShape`).
 *
 * A value that can only be a primitive is not an operator object, so it is not
 * the bug: `Number(x)`, `parseInt(x)`, `parseFloat(x)` and `String(x)`, a unary
 * operator (`+x`, `-x`, `!x`), a template literal or a binary expression. What
 * stays reported is the request value itself, picked out of `a || b` / `c ? a :
 * b`, an array element (`$nin: [req.query.role]`), or passed through any other
 * call — `JSON.parse(req.query.min)` is an object again.
 */
function readsRequestInput(
  node: TSESTree.Node,
  sourceCode: ScopeReader,
): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.MemberExpression:
      return readsRequestShape(node, sourceCode);
    case AST_NODE_TYPES.LogicalExpression:
      return (
        readsRequestInput(node.left, sourceCode) ||
        readsRequestInput(node.right, sourceCode)
      );
    case AST_NODE_TYPES.ConditionalExpression:
      return (
        readsRequestInput(node.consequent, sourceCode) ||
        readsRequestInput(node.alternate, sourceCode)
      );
    case AST_NODE_TYPES.ArrayExpression:
      return node.elements.some(
        (element) => element !== null && readsRequestInput(element, sourceCode),
      );
    case AST_NODE_TYPES.SpreadElement:
      return readsRequestInput(node.argument, sourceCode);
    case AST_NODE_TYPES.CallExpression:
      return (
        !PRIMITIVE_COERCIONS.has(memberPath(node.callee)?.join('.') ?? '') &&
        node.arguments.some((argument) =>
          readsRequestInput(argument, sourceCode),
        )
      );
    default:
      // Identifiers (no dataflow — see ILB-0123), literals, and every
      // primitive-producing expression: unary, binary, template literal.
      return false;
  }
}

export const noOperatorInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-operator-injection',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-operator-injection.md',
      description: 'Prevent MongoDB operator injection attacks via user input',
      cwe: 'CWE-943',
      cvss: 9.1,
    },
    messages: {
      operatorInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MongoDB Operator Injection',
        cwe: 'CWE-943',
        owasp: 'A03:2021',
        cvss: 9.1,
        description:
          'User input may contain MongoDB operators like { $ne: null } to bypass filters',
        severity: 'CRITICAL',
        fix: 'Use { field: { $eq: value } } pattern to prevent operator injection',
        documentationLink:
          'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection',
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

        if (!keyName) return;

        if (
          DANGEROUS_OPERATORS.has(keyName) &&
          readsRequestInput(node.value, context.sourceCode)
        ) {
          context.report({
            node,
            messageId: 'operatorInjection',
          });
        }
      },
    };
  },
});

export default noOperatorInjection;
