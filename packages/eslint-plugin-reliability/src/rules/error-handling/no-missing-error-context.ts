/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-error-context
 * Detects thrown errors without context
 *
 * @see https://rules.sonarsource.com/javascript/RSPEC-1128/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  staticString,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  'missingErrorContext' | 'addErrorMessage' | 'addErrorStack' | 'useErrorClass';

export interface Options {
  /** Require error message. Default: true */
  requireMessage?: boolean;

  /** Require stack trace. Default: false */
  requireStackTrace?: boolean;

  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
}

type RuleOptions = [Options?];

/** The Error constructors the language defines. Their first parameter is the message. */
const BUILTIN_ERROR_CONSTRUCTORS = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'ReferenceError',
  'EvalError',
  'URIError',
  'AggregateError',
]);

/**
 * Can a reader see that this expression is a string?
 *
 * A literal or a template is one outright. `a ?? b`, `a || b` and `c ? a : b`
 * are strings when a branch you can see is — `message ?? \`Expected values to be
 * strictly equal\`` is the fallback spelled out, and reading only the outermost
 * node called it "not a string".
 */
function isProvablyString(node: TSESTree.Node): boolean {
  if (node.type === 'TemplateLiteral') return true;
  // A literal proves a string only when there is something IN it. `value ?? ''`
  // reaches an empty message on the branch that made the fallback necessary.
  if (node.type === 'Literal') {
    return typeof node.value === 'string' && node.value.length > 0;
  }
  if (node.type === 'LogicalExpression') {
    // `&&` evaluates to its RIGHT operand whenever the left is truthy, so a string
    // on the left proves nothing: `'x' && someVar` is `someVar`. `??` and `||` can
    // land on either side, so either being a string is enough.
    return node.operator === '&&'
      ? isProvablyString(node.right)
      : isProvablyString(node.left) || isProvablyString(node.right);
  }
  if (node.type === 'ConditionalExpression') {
    return (
      isProvablyString(node.consequent) || isProvablyString(node.alternate)
    );
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return isProvablyString(node.left) || isProvablyString(node.right);
  }
  return false;
}

/**
 * Check if error has a message
 */
function hasErrorMessage(node: TSESTree.ThrowStatement): boolean {
  if (!node.argument) {
    return false;
  }

  // `throw error;` — re-throwing a caught/named identifier. The original
  // error already carries its own message + stack; demanding context on the
  // re-throw is an FP. Same for `throw err`, `throw cause`, etc. Excludes
  // the literal-like `undefined` / `NaN` / `Infinity` identifiers, which
  // are typed as global constants but carry no diagnostic value.
  if (
    node.argument.type === 'Identifier' &&
    node.argument.name !== 'undefined' &&
    node.argument.name !== 'NaN' &&
    node.argument.name !== 'Infinity'
  ) {
    return true;
  }

  // `throw Error(msg)` and `throw new Error(msg)` build the same object — the spec
  // makes `new` optional on the Error constructors, and yargs writes it without.
  // Reading only `NewExpression` meant the callable form had "no message".
  const constructed =
    node.argument.type === 'NewExpression' ||
    node.argument.type === 'CallExpression'
      ? node.argument
      : null;

  if (constructed !== null && constructed.callee.type === 'Identifier') {
    // `new X(…)` says "this is an error class" by construction. A bare CALL says
    // nothing of the kind — `throw fail(code)`, `throw wrap(err)`, `throw t('key')`
    // are all ordinary functions — so only the built-in constructors, which really
    // do work without `new`, take the callable form.
    if (
      constructed.type === 'CallExpression' &&
      !BUILTIN_ERROR_CONSTRUCTORS.has(constructed.callee.name)
    ) {
      return false;
    }
    if (constructed.arguments.length === 0) {
      return false;
    }
    const firstArg = constructed.arguments[0];
    const staticText = staticString(firstArg);
    if (staticText !== null) {
      return staticText.length > 0;
    }
    // A CUSTOM error class builds its own message from what it is handed, so the
    // argument IS the context: `new UsageError(msg, hint)`, `new ActionRequired(spec)`,
    // `new ExitSignal(code)`. This used to be gated on the name ENDING in "Error",
    // which said nothing about a class named for what happened rather than for its
    // base. The built-in constructors keep the stricter reading below.
    if (!BUILTIN_ERROR_CONSTRUCTORS.has(constructed.callee.name)) {
      return true;
    }
    // For the built-ins the first parameter is the message itself, so it has to be
    // one: `new Error(someVar)` proves nothing about what `someVar` holds. A
    // template literal does, and so does `message ?? \`fallback\`` — every branch a
    // reader can see is a string.
    return isProvablyString(firstArg);
  }

  // Check if it's a string literal
  if (
    node.argument.type === 'Literal' &&
    typeof node.argument.value === 'string'
  ) {
    return node.argument.value.length > 0;
  }

  // Check if it's a template literal
  if (node.argument.type === 'TemplateLiteral') {
    return true;
  }

  return false;
}

/**
 * Check if error is an Error instance (has stack trace)
 */
function hasErrorStack(node: TSESTree.ThrowStatement): boolean {
  if (!node.argument) {
    return false;
  }

  // `throw error;` — caught/named identifier already has a stack from the
  // place where it was first thrown. Re-throws preserve the stack. Excludes
  // `undefined` / `NaN` / `Infinity` global-constant identifiers.
  if (
    node.argument.type === 'Identifier' &&
    node.argument.name !== 'undefined' &&
    node.argument.name !== 'NaN' &&
    node.argument.name !== 'Infinity'
  ) {
    return true;
  }

  // Check if it's an Error instance. `Error(msg)` without `new` is one too.
  if (
    (node.argument.type === 'NewExpression' ||
      node.argument.type === 'CallExpression') &&
    node.argument.callee.type === 'Identifier'
  ) {
    const calleeName = node.argument.callee.name;
    // Error, TypeError, ReferenceError, etc. all have stack traces
    if (calleeName === 'Error' || calleeName.endsWith('Error')) {
      return true;
    }
  }

  return false;
}

export const noMissingErrorContext = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-error-context',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-reliability/docs/rules/no-missing-error-context.md',
      description: 'Detects thrown errors without context',
    },
    hasSuggestions: true,
    messages: {
      missingErrorContext: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing error context',
        description: 'Thrown error missing {{missing}}',
        severity: 'MEDIUM',
        fix: 'Add error message and use Error class for stack trace',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-1128/',
      }),
      addErrorMessage: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Error Message',
        description: 'Add descriptive error message',
        severity: 'LOW',
        fix: 'throw new Error("descriptive message")',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error',
      }),
      addErrorStack: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Error Class',
        description: 'Use Error class for stack trace',
        severity: 'LOW',
        fix: 'throw new Error(message) instead of throw message',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error',
      }),
      useErrorClass: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Specific Error',
        description: 'Use specific error class',
        severity: 'LOW',
        fix: 'throw new TypeError("message") or throw new RangeError("message")',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          requireMessage: {
            type: 'boolean',
            default: true,
            description: 'Require error message',
          },
          requireStackTrace: {
            type: 'boolean',
            default: false,
            description: 'Require stack trace',
          },
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      requireMessage: true,
      requireStackTrace: false,
      ignoreInTests: true,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      requireMessage = true,
      requireStackTrace = false,
      ignoreInTests = true,
    }: Options = options || {};

    const filename = context.filename;
    const isTestFile =
      ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    /**
     * Check throw statements
     */
    function checkThrowStatement(node: TSESTree.ThrowStatement) {
      const missing: string[] = [];

      if (requireMessage && !hasErrorMessage(node)) {
        missing.push('message');
      }

      if (requireStackTrace && !hasErrorStack(node)) {
        missing.push('stack trace');
      }

      if (missing.length === 0) {
        return;
      }

      context.report({
        node,
        messageId: 'missingErrorContext',
        data: {
          missing: missing.join(' and '),
        },
        suggest: [
          {
            messageId: 'addErrorMessage',
            fix: () => null, // Cannot auto-fix without context
          },
          {
            messageId: 'addErrorStack',
            fix: () => null,
          },
          {
            messageId: 'useErrorClass',
            fix: () => null,
          },
        ],
      });
    }

    return {
      ThrowStatement: checkThrowStatement,
    };
  },
});
