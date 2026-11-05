/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: error-message
 * Enforces providing a message when creating built-in Error objects
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  isGlobalReference,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingErrorMessage' | 'addErrorMessage';

export interface Options {
  /** Allow Error() without message (not recommended) */
  allowEmptyCatch?: boolean;
}

type RuleOptions = [Options?];

export const errorMessage = createRule<RuleOptions, MessageIds>({
  name: 'error-message',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'unicorn/error-message',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-maintainability/docs/rules/error-message.md',
      description:
        'Enforce providing a message when creating built-in Error objects for better debugging',
    },
    hasSuggestions: true,
    messages: {
      missingErrorMessage: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Missing Error Message',
        description: 'Error constructor called without message parameter',
        severity: 'HIGH',
        fix: 'Add descriptive error message: new Error("description")',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/error-message.md',
      }),
      addErrorMessage: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Add Error Message',
        description: 'Add descriptive error message to constructor',
        severity: 'HIGH',
        fix: 'Add descriptive error message: new Error("description")',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/error-message.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowEmptyCatch: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowEmptyCatch: false }],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowEmptyCatch: boolean;
    let errorConstructors: Set<string>;

    function isErrorConstructor(name: string): boolean {
      return errorConstructors.has(name);
    }

    /**
     * Does the first argument carry a message? Only an argument the code
     * proves carries no text answers no: none at all, `undefined`, a literal
     * that is not a string (`null`, `42`), or a string literal / template with
     * nothing but whitespace in it. Anything else — a variable, a call, a
     * template with a substitution — may be a message.
     */
    function hasMessageArgument(
      node: TSESTree.NewExpression | TSESTree.CallExpression,
    ): boolean {
      const firstArg = node.arguments[0];
      if (!firstArg) return false;
      if (firstArg.type === 'Literal') {
        return (
          typeof firstArg.value === 'string' && firstArg.value.trim().length > 0
        );
      }
      if (firstArg.type === 'TemplateLiteral') {
        return (
          firstArg.expressions.length > 0 ||
          String(firstArg.quasis[0].value.cooked).trim().length > 0
        );
      }
      if (firstArg.type === 'Identifier' && firstArg.name === 'undefined') {
        return !isGlobalReference(firstArg, context.sourceCode);
      }
      return true;
    }

    /**
     * The built-in Error constructor this callee reaches, or `null`. Decided by
     * binding: `Error` must be the global (a local class of that name is not
     * the language's), reached bare or as `globalThis.Error`.
     */
    function builtinErrorName(callee: TSESTree.Node): string | null {
      if (callee.type === 'Identifier') {
        return isErrorConstructor(callee.name) &&
          isGlobalReference(callee, context.sourceCode)
          ? callee.name
          : null;
      }
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'globalThis' &&
        isGlobalReference(callee.object, context.sourceCode)
      ) {
        const name = propertyName(callee);
        return name !== null && isErrorConstructor(name) ? name : null;
      }
      return null;
    }

    function isInCatchClause(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node;
      while (current) {
        if (current.type === 'CatchClause') {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    function checkErrorCreation(
      node: TSESTree.NewExpression | TSESTree.CallExpression,
    ) {
      const constructorName = builtinErrorName(node.callee);

      if (!constructorName) {
        return;
      }

      // Allow empty catch if option is enabled
      if (allowEmptyCatch && isInCatchClause(node)) {
        return;
      }

      // Check if message is provided
      if (!hasMessageArgument(node)) {
        context.report({
          node,
          messageId: 'missingErrorMessage',
          data: {
            constructor: constructorName,
          },
          suggest: [
            {
              messageId: 'addErrorMessage',
              data: { constructor: constructorName },
              fix(fixer: TSESLint.RuleFixer) {
                if (node.arguments.length === 0) {
                  // No arguments: replace the empty parentheses with ("Error message")
                  const parenStart = node.callee.range[1];
                  const parenEnd = node.range[1];
                  return fixer.replaceTextRange(
                    [parenStart, parenEnd],
                    '("Error message")',
                  );
                } else {
                  // Has arguments: replace the first argument with "Error message"
                  return fixer.replaceText(
                    node.arguments[0],
                    '"Error message"',
                  );
                }
              },
            },
          ],
        });
      }
    }

    return {
      before() {
        const [options] = context.options;
        ({ allowEmptyCatch = false } = options || {});

        // Built-in Error constructors that should have messages
        errorConstructors = new Set([
          'Error',
          'TypeError',
          'ReferenceError',
          'SyntaxError',
          'RangeError',
          'EvalError',
          'URIError',
        ]);
      },
      NewExpression: checkErrorCreation,
      CallExpression: checkErrorCreation,
    };
  },
});
