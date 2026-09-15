/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-render-return
 * Require render methods to return
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'requireRenderReturn';

export const requireRenderReturn = createRule<[], MessageIds>({
  name: 'require-render-return',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/require-render-return.md',
      description: 'Require render methods to return',
    },
    schema: [],
    messages: {
      requireRenderReturn: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Render Return',
        description: 'Render method must return a value',
        severity: 'CRITICAL',
        fix: 'Add return statement or return JSX/null',
        documentationLink: 'https://react.dev/reference/react/Component#render',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'render' &&
          node.value.type === 'FunctionExpression'
        ) {
          const body = node.value.body;

          // Check if render method has a return statement
          if (!hasReturnStatement(body)) {
            context.report({
              node: node.key,
              messageId: 'requireRenderReturn',
            });
          }
        }
      },
    };

    function hasReturnStatement(
      node: TSESTree.Statement | TSESTree.BlockStatement,
    ): boolean {
      // Handle BlockStatement
      if (node.type === 'BlockStatement') {
        for (const statement of node.body) {
          if (checkStatement(statement)) {
            return true;
          }
        }
        return false;
      }

      // Handle single statement
      return checkStatement(node);
    }

    function checkStatement(statement: TSESTree.Statement): boolean {
      if (statement.type === 'ReturnStatement') {
        return true;
      }

      // An `if` only guarantees a return when EVERY path through it returns:
      // there must be an `else`, and both branches must return. A returning
      // consequent alone still falls through when the test is false, which is
      // the shape the docs print as incorrect. A caller that returns after the
      // `if` is still covered, because hasReturnStatement scans the whole block.
      if (statement.type === 'IfStatement') {
        return (
          statement.alternate != null &&
          hasReturnStatement(statement.consequent) &&
          hasReturnStatement(statement.alternate)
        );
      }

      if (statement.type === 'BlockStatement') {
        return hasReturnStatement(statement);
      }

      // A switch guarantees a return only when NO path escapes it.
      //
      // This used to answer "does any clause contain a return?", which is a
      // different question: `switch (k) { case 1: return <A/>; }` satisfied it
      // while an unmatched `k` fell straight out and left render() returning
      // undefined — the defect this rule exists to catch, hidden by the shape
      // of the check rather than absent.
      //
      // Two conditions, walked from the last clause upward:
      //
      //   1. A `default` must exist, or an unmatched selector escapes.
      //   2. Every clause must end in a return — its own, or one it falls
      //      through into. An EMPTY consequent is deliberate fallthrough and
      //      inherits the clause below it. A consequent ending in `break`
      //      exits without returning. Anything else falls through too.
      //
      // Clause bodies are judged by `checkStatement`, so an `if`/`else` that
      // returns on both arms counts — a clause is not required to hold a bare
      // `ReturnStatement` of its own.
      if (statement.type === 'SwitchStatement') {
        if (!statement.cases.some((switchCase) => switchCase.test === null)) {
          return false;
        }

        // Falling past the last clause escapes the switch, so start there.
        let covered = false;
        for (let i = statement.cases.length - 1; i >= 0; i--) {
          const { consequent } = statement.cases[i]!;
          if (
            consequent.some((caseStatement) => checkStatement(caseStatement))
          ) {
            covered = true;
          } else if (
            consequent[consequent.length - 1]?.type === 'BreakStatement'
          ) {
            covered = false;
          }
          // Otherwise the clause falls through and inherits `covered`.
          if (!covered) return false;
        }
        return true;
      }

      return false;
    }
  },
});
