/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-regex-query
 * Detects ReDoS and injection via $regex operator
 * CWE-400: Resource Exhaustion
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

type MessageIds = 'unsafeRegex';
export interface Options {
  allowInTests?: boolean;
}
type RuleOptions = [Options?];

const USER_INPUT_PATTERNS = [
  'req.body',
  'req.query',
  'req.params',
  'request.body',
  'request.query',
  'request.params',
  'ctx.request.body',
  'ctx.query',
  'ctx.params',
];

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
  return '';
}

function containsUserInput(node: TSESTree.Node): boolean {
  const source = getNodeSource(node);
  return USER_INPUT_PATTERNS.some((pattern) => source.includes(pattern));
}

/**
 * `new RegExp(req.query.q)` / `RegExp(req.query.q)` — a pattern compiled from
 * user input. Mongo runs a RegExp filter value exactly as it runs `$regex`, so
 * `{ name: new RegExp(q) }` is the same sink with no operator key to look for.
 */
function isUserRegExp(node: TSESTree.Node): boolean {
  if (
    (node.type !== AST_NODE_TYPES.NewExpression &&
      node.type !== AST_NODE_TYPES.CallExpression) ||
    node.callee.type !== AST_NODE_TYPES.Identifier ||
    node.callee.name !== 'RegExp'
  ) {
    return false;
  }
  const [pattern] = node.arguments;
  return (
    pattern?.type === AST_NODE_TYPES.MemberExpression &&
    containsUserInput(pattern)
  );
}

/** The names a regex-escaping helper goes by: lodash's, and the common hand-rolled ones. */
const REGEX_ESCAPE_NAMES: ReadonlySet<string> = new Set([
  'escapeRegex',
  'escapeRegExp',
  'escapeStringRegexp',
]);

/** Packages whose default export escapes a string for a RegExp, whatever it is imported as. */
const REGEX_ESCAPE_MODULES: ReadonlySet<string> = new Set([
  'escape-string-regexp',
  'lodash.escaperegexp',
]);

/**
 * `escapeRegex(q)`, `_.escapeRegExp(q)`, or the default export of
 * `escape-string-regexp` / `lodash.escaperegexp` under any local name.
 *
 * Every interpolation in a `$regex` template used to be reported, so the
 * rule's own documented fix — `` `^${escapeRegex(q)}` ``, an escaped value
 * anchored — was a finding. An escaped string matches itself literally: no
 * metacharacter is left for a ReDoS pattern or a `.*` to be built from.
 * Recognised by NAME, as the owner decided (2026-10-18); a helper named
 * `escapeRegex` that does not escape is the user's own bug to own.
 */
function isRegexEscape(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  const { callee } = node;
  const name =
    callee.type === AST_NODE_TYPES.Identifier
      ? callee.name
      : callee.type === AST_NODE_TYPES.MemberExpression
        ? propertyName(callee)
        : null;
  if (name !== null && REGEX_ESCAPE_NAMES.has(name)) return true;
  const binding = resolveModuleBinding(callee, scope);
  return (
    binding !== undefined &&
    REGEX_ESCAPE_MODULES.has(binding.module) &&
    binding.path.length === 0
  );
}

/** Operators whose value is an array of filter documents. */
const LOGICAL_OPERATORS = new Set(['$or', '$and', '$nor']);

const QUERY_METHODS = new Set([
  'find',
  'findOne',
  'findById',
  'findOneAndUpdate',
  'findOneAndDelete',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
]);

export const noUnsafeRegexQuery = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-regex-query',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mongodb-security/docs/rules/no-unsafe-regex-query.md',
      description: 'Prevent ReDoS attacks via $regex with user input',
      cwe: 'CWE-400',
      cvss: 7.5,
    },
    messages: {
      unsafeRegex: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'ReDoS via $regex',
        cwe: 'CWE-400',
        owasp: 'A03:2021',
        cvss: 7.5,
        description:
          'User input in $regex can cause ReDoS or information disclosure',
        severity: 'HIGH',
        fix: 'Escape special regex characters and anchor patterns',
        documentationLink:
          'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
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
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        // `User['find'](...)` calls the same method the dotted form does.
        const methodName = propertyName(node.callee);

        if (!methodName || !QUERY_METHODS.has(methodName)) {
          return;
        }

        // Check first argument (the query object)
        const queryArg = node.arguments[0];
        if (!queryArg || queryArg.type !== AST_NODE_TYPES.ObjectExpression) {
          return;
        }

        checkFilter(queryArg, node);
      },
    };

    /** Every property of a filter document, recursing into `$or`/`$and`/`$nor`. */
    function checkFilter(
      filter: TSESTree.ObjectExpression,
      reportNode: TSESTree.CallExpression,
    ) {
      for (const prop of filter.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;
        const { value } = prop;
        if (
          value.type === AST_NODE_TYPES.ArrayExpression &&
          LOGICAL_OPERATORS.has(objectKeyName(prop) ?? '')
        ) {
          for (const branch of value.elements) {
            if (branch?.type === AST_NODE_TYPES.ObjectExpression) {
              checkFilter(branch, reportNode);
            }
          }
          continue;
        }
        // `{ name: new RegExp(req.query.q) }`
        if (isUserRegExp(value)) {
          context.report({ node: reportNode, messageId: 'unsafeRegex' });
          continue;
        }
        checkForUnsafeRegex(value, reportNode);
      }
    }

    function checkForUnsafeRegex(
      node: TSESTree.Node,
      reportNode: TSESTree.CallExpression,
    ) {
      // Check for { $regex: userInput }
      if (node.type !== AST_NODE_TYPES.ObjectExpression) return;
      for (const prop of node.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;
        if (objectKeyName(prop) !== '$regex') continue;
        const { value } = prop;
        if (
          // `{ $regex: req.query.q }`
          (value.type === AST_NODE_TYPES.MemberExpression &&
            containsUserInput(value)) ||
          // A template literal interpolating anything but an escaped value
          (value.type === AST_NODE_TYPES.TemplateLiteral &&
            value.expressions.some(
              (expression) =>
                !isRegexEscape(
                  expression,
                  context.sourceCode.getScope(expression),
                ),
            )) ||
          // `{ $regex: new RegExp(req.query.q) }`
          isUserRegExp(value)
        ) {
          context.report({ node: reportNode, messageId: 'unsafeRegex' });
        }
      }
    }
  },
});

export default noUnsafeRegexQuery;
