/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent exposing stack traces to users
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/209.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  followConst,
  formatLLMMessage,
  MessageIcons,
  namesOneOf,
  objectKeyName,
  propertyName,
  variableOf,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

/** How deep into nested object literals a stack is looked for. */
const MAX_DEPTH = 4;

/**
 * Does this value carry an error's `.stack`? Decided by where the value comes
 * from, never by a property NAME: `{ stack: 'hidden' }` names a key `stack`
 * but leaks nothing, while `{ trace: err.stack }` and
 * `` `Failed: ${err.stack}` `` leak the trace under any name.
 */
function carriesStack(
  node: TSESTree.Node,
  sourceCode: Readonly<TSESLint.SourceCode>,
  depth = 0,
): boolean {
  if (depth > MAX_DEPTH) return false;
  const value = followConst(node, sourceCode);
  switch (value.type) {
    case AST_NODE_TYPES.MemberExpression:
      return propertyName(value) === 'stack';
    case AST_NODE_TYPES.Identifier:
      return isDestructuredStack(value, sourceCode);
    case AST_NODE_TYPES.ObjectExpression:
      // A spread copies own ENUMERABLE properties, and an Error's `stack` is
      // not one, so only written properties count.
      return value.properties.some(
        (p) =>
          p.type === AST_NODE_TYPES.Property &&
          carriesStack(p.value, sourceCode, depth + 1),
      );
    case AST_NODE_TYPES.TemplateLiteral:
      return value.expressions.some((e) =>
        carriesStack(e, sourceCode, depth + 1),
      );
    case AST_NODE_TYPES.BinaryExpression:
      return (
        value.operator === '+' &&
        (carriesStack(value.left, sourceCode, depth + 1) ||
          carriesStack(value.right, sourceCode, depth + 1))
      );
    default:
      return false;
  }
}

/** `const { stack } = err` / `const { stack: s } = err`. */
function isDestructuredStack(
  id: TSESTree.Identifier,
  sourceCode: Readonly<TSESLint.SourceCode>,
): boolean {
  const variable = variableOf(id, sourceCode);
  const def = variable?.defs[0];
  if (def?.type !== 'Variable' || def.node.id.type !== 'ObjectPattern')
    return false;
  return def.node.id.properties.some(
    (p) =>
      p.type === AST_NODE_TYPES.Property &&
      (p.value.type === AST_NODE_TYPES.AssignmentPattern
        ? p.value.left
        : p.value) === variable?.identifiers[0] &&
      objectKeyName(p) === 'stack',
  );
}

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noVerboseErrorMessages = createRule<RuleOptions, MessageIds>({
  name: 'no-verbose-error-messages',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-operability/docs/rules/no-verbose-error-messages.md',
      description: 'Prevent exposing stack traces to users',
      cwe: 'CWE-209',
      cvss: 5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-209',
        description:
          'Prevent exposing stack traces to users detected - this is a security risk',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/209.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check res.send/res.json with error.stack
        if (
          node.type === AST_NODE_TYPES.CallExpression &&
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          // @vocabulary Express response API
          // `res['send'](err.stack)` leaks the same stack `res.send` does.
          namesOneOf(propertyName(node.callee), ['send', 'json'])
        ) {
          const arg = node.arguments[0];
          if (arg !== undefined && carriesStack(arg, context.sourceCode)) {
            report(node);
          }
        }
      },
    };
  },
});
