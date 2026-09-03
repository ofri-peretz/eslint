/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-query
 * Detects potential NoSQL injection via string concatenation in MongoDB queries.
 * CWE-943: Improper Neutralization of Special Elements in Data Query Logic
 *
 * @see https://cwe.mitre.org/data/definitions/943.html
 * @see https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  readsRequestShape,
} from '@interlace/eslint-devkit';
import { fileUsesMongo } from '../../utils/mongo-evidence';

type MessageIds = 'unsafeQuery' | 'suggestionUseEq';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Additional method names to check. Default: [] */
  additionalMethods?: string[];
}

type RuleOptions = [Options?];

// MongoDB/Mongoose query methods
const QUERY_METHODS = [
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
  'aggregate',
];

/**
 * The shape a scope reader needs. `readsRequestShape` walks to the root of a
 * member chain and asks whether that binding ARRIVED as a parameter.
 */
type ScopeReader = Parameters<typeof readsRequestShape>[1];

/**
 * Whether an expression reads an HTTP request.
 *
 * Recurses into composite expressions (TemplateLiteral, BinaryExpression,
 * CallExpression) — without this, `$where: \`this.name == '${req.query.x}'\``
 * was being missed because TemplateLiteral was stringified to '[expression]'
 * before pattern matching (real FN found by the CWE-943 corpus).
 *
 * The member-expression case used to compare printed source against a list of
 * ten strings — `'req.body'`, `'request.query'`, `'ctx.params'`. That list was
 * simultaneously too narrow and too wide: a handler written `(request, reply)`
 * is Fastify's own convention and matched nothing, while any local variable a
 * developer happened to call `req` matched everything. `readsRequestShape`
 * asks the structural question instead — is this a read of `.query` /
 * `.params` / `.headers` / `.cookies` off something that ARRIVED as a
 * parameter — so the answer no longer depends on spelling.
 */
function containsUserInput(
  node: TSESTree.Node,
  sourceCode: ScopeReader,
): boolean {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.some((e) => containsUserInput(e, sourceCode));
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression) {
    return (
      containsUserInput(node.left, sourceCode) ||
      containsUserInput(node.right, sourceCode)
    );
  }
  if (node.type === AST_NODE_TYPES.CallExpression) {
    return (
      containsUserInput(node.callee, sourceCode) ||
      node.arguments.some(
        (a) =>
          a.type !== 'SpreadElement' &&
          containsUserInput(a as TSESTree.Node, sourceCode),
      )
    );
  }
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    return readsRequestShape(node, sourceCode);
  }
  // A bare identifier says nothing on its own. Resolving it would need real
  // dataflow, and guessing costs a false positive on every `const` in a
  // filter — see ILB-0123.
  return false;
}

/**
 * Get source code representation of a node (simplified)
 */
function getNodeSource(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return node.name;
  }
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    const obj = getNodeSource(node.object);
    const prop =
      node.property.type === AST_NODE_TYPES.Identifier
        ? node.property.name
        : '[computed]';
    return `${obj}.${prop}`;
  }
  // The Literal branch is gone. It existed so `'req.body'.x` — a STRING whose
  // contents happened to read like a request path — stringified to the tainted
  // pattern and reported. That was the string-matching model's purest false
  // positive: quoting the text was enough to trip the rule. With the taint
  // decision structural, a literal can no longer reach here at all.
  return '[expression]';
}

/**
 * Check if a property value is potentially unsafe
 */
function isUnsafePropertyValue(
  node: TSESTree.Node,
  sourceCode: ScopeReader,
): boolean {
  // A bare identifier used to return `true` here, which meant every `const`
  // in a filter was reported as user input — `find({ name: NAME })` with
  // `const NAME = 'root'` two lines up produced `User input "NAME" is used
  // directly`. That is ILB-0123, and a false positive is spent on every build
  // a consumer runs.
  //
  // Member expression like req.body.username
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    return containsUserInput(node, sourceCode);
  }

  // Template literal - always unsafe for queries
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.length > 0;
  }

  // Binary expression (string concatenation)
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return true;
  }

  return false;
}

export const noUnsafeQuery = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-query',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-unsafe-query.md',
      description:
        'Prevent NoSQL injection via direct use of user input in MongoDB queries',
      cwe: 'CWE-943',
      cvss: 9.8,
      confidence: 'medium',
    },
    hasSuggestions: true,
    messages: {
      unsafeQuery: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'NoSQL Injection via Unsafe Query',
        cwe: 'CWE-943',
        owasp: 'A03:2021',
        cvss: 9.8,
        description:
          'User input "{{input}}" is used directly in MongoDB query. Attackers can inject operators like { $ne: null } to bypass authentication.',
        severity: 'CRITICAL',
        fix: 'Wrap user input with explicit $eq operator: { field: { $eq: sanitize(value) } }',
        documentationLink:
          'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection',
      }),
      suggestionUseEq: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use $eq Operator',
        description:
          'Wrap the value with { $eq: value } to prevent operator injection',
        severity: 'LOW',
        fix: 'Replace direct value with { $eq: sanitizedValue }',
        documentationLink:
          'https://www.mongodb.com/docs/manual/reference/operator/query/eq/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          additionalMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, additionalMethods: [] }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    // Every rule here is MongoDB-specific, and none of them could ask the
    // file-level question: over the corpus, 47% of this plugin's findings were
    // in files with no Mongo in them. `receiver.ts` discriminates by receiver
    // NAME, which matches `userModel.findOne()` in a TypeORM repository just as
    // well as in a Mongoose one. Registering no visitors is both the gate and
    // the cheap path.
    if (!fileUsesMongo(context.sourceCode.ast)) return {};

    const { allowInTests = true, additionalMethods = [] } = options as Options;
    const filename = context.filename;
    const inTestFile = isTestFilePath(filename);

    if (allowInTests && inTestFile) {
      return {};
    }

    const allMethods = new Set([...QUERY_METHODS, ...additionalMethods]);

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check if this is a MongoDB query method call
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const methodName =
          node.callee.property.type === AST_NODE_TYPES.Identifier
            ? node.callee.property.name
            : null;

        if (!methodName || !allMethods.has(methodName)) {
          return;
        }

        // Check first argument (the query object)
        const queryArg = node.arguments[0];
        if (!queryArg) return;

        // `find(req.body)` — the caller hands you the whole query document.
        // `{"$ne": null}` as a password turns the lookup into "any user",
        // which is the canonical NoSQL authentication bypass and the most
        // direct form the bug takes. This early-returned on anything that was
        // not an object literal, so it was missed entirely (ILB-0121).
        if (
          queryArg.type !== AST_NODE_TYPES.ObjectExpression &&
          queryArg.type !== AST_NODE_TYPES.SpreadElement &&
          // `bodyNeedsDepth: false` — the argument POSITION supplies the
          // meaning the depth rule normally waits for. A bare `.body` is
          // ambiguous in general; a bare `.body` used as the filter document
          // of a Mongo query is the bug itself.
          (readsRequestShape(queryArg, context.sourceCode, {
            bodyNeedsDepth: false,
          }) ||
            containsUserInput(queryArg, context.sourceCode))
        ) {
          context.report({
            node: queryArg,
            messageId: 'unsafeQuery',
            data: { input: getNodeSource(queryArg) },
            suggest: [
              {
                messageId: 'suggestionUseEq',
                fix(fixer: TSESLint.RuleFixer) {
                  const valueText = context.sourceCode.getText(queryArg);
                  return fixer.replaceText(queryArg, `{ $eq: ${valueText} }`);
                },
              },
            ],
          });
          return;
        }

        if (queryArg.type !== AST_NODE_TYPES.ObjectExpression) {
          return;
        }

        // Check each property in the query object
        for (const prop of queryArg.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) {
            continue;
          }

          const value = prop.value;

          // Check if the value is potentially unsafe
          if (isUnsafePropertyValue(value, context.sourceCode)) {
            const inputSource = getNodeSource(value);

            if (containsUserInput(value, context.sourceCode)) {
              context.report({
                node: prop,
                messageId: 'unsafeQuery',
                data: {
                  input: inputSource,
                },
                suggest: [
                  {
                    messageId: 'suggestionUseEq',
                    fix(fixer: TSESLint.RuleFixer) {
                      const sourceCode = context.sourceCode;
                      const valueText = sourceCode.getText(value);
                      return fixer.replaceText(value, `{ $eq: ${valueText} }`);
                    },
                  },
                ],
              });
            }
          }
        }
      },
    };
  },
});

export default noUnsafeQuery;
