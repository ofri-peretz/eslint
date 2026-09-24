/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-at
 * Prefer .at() method over array[index] for accessing elements from end (unicorn-inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds =
  'preferAtMethod' | 'useAtForLastElement' | 'useAtForNegativeIndex';

export interface Options {
  /** Check for last element access patterns */
  checkLastElement?: boolean;
}

type RuleOptions = [Options?];

/**
 * Is this member expression being WRITTEN to rather than read?
 *
 * `.at()` returns a value, not a reference, so none of these positions can use
 * it — `arr.at(-1) = 5` is a syntax error, and so are the compound, update and
 * delete forms.
 *
 * Only the shapes with a test behind them are listed. An earlier draft also
 * enumerated ObjectPattern, AssignmentPattern, Property and RestElement, and
 * the 100% branch gate rejected it: every one was unreachable here, because a
 * computed member expression in those positions is reached through
 * `AssignmentExpression.left` or `ArrayPattern` instead. Guessing at parent
 * types is how a guard grows branches nobody can trigger.
 */
function isWriteTarget(node: TSESTree.MemberExpression): boolean {
  const parent = node.parent as TSESTree.Node;
  switch (parent.type) {
    case 'AssignmentExpression':
      return parent.left === node;
    case 'UpdateExpression':
      return parent.argument === node;
    case 'UnaryExpression':
      return parent.operator === 'delete';
    case 'ForOfStatement':
    case 'ForInStatement':
      return parent.left === node;
    case 'ArrayPattern':
      return true;
    default:
      return false;
  }
}

/**
 * Is this member expression the function being called, constructed or tagged?
 *
 * The rewrite is not equivalent there. `a.b[i]()` calls with `this === a.b`,
 * `a.b.at(-1)()` with `this` undefined. `new c[i]()` becomes `new c.at(-1)()`,
 * which parses as `new (c.at)(-1)` and throws "c.at is not a constructor".
 *
 * TS wrappers (`x!`, `x as T`, `x satisfies T`, `<T>x`) and a parenthesised
 * optional chain erase at runtime — `(a.b[i] as F)()` still binds `this` to
 * `a.b` — so walk through them before checking the call.
 */
const TRANSPARENT_WRAPPERS = new Set([
  'TSNonNullExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
  'ChainExpression',
]);

function isCalleeOrTag(node: TSESTree.MemberExpression): boolean {
  let child: TSESTree.Node = node;
  let parent = node.parent as TSESTree.Node;
  while (TRANSPARENT_WRAPPERS.has(parent.type)) {
    child = parent;
    parent = parent.parent as TSESTree.Node;
  }
  switch (parent.type) {
    case 'CallExpression':
    case 'NewExpression':
      return parent.callee === child;
    case 'TaggedTemplateExpression':
      return parent.tag === child;
    default:
      return false;
  }
}

export const preferAt = createRule<RuleOptions, MessageIds>({
  name: 'prefer-at',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-modernization/docs/rules/prefer-at.md',
      description:
        'Prefer .at() method over bracket notation for accessing elements from the end',
    },
    fixable: 'code',
    hasSuggestions: false,
    messages: {
      preferAtMethod: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Legacy Array Access',
        description: 'Use .at() method for clearer array element access',
        severity: 'MEDIUM',
        fix: 'Replace array[array.length - n] with array.at(-n)',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at',
      }),
      useAtForLastElement: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use .at(-1)',
        description: 'Use array.at(-1) for last element',
        severity: 'LOW',
        fix: 'array.at(-1) instead of array[array.length - 1]',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at',
      }),
      useAtForNegativeIndex: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use .at()',
        description: 'Use array.at() for negative index',
        severity: 'LOW',
        fix: 'array.at(index) for clearer negative index access',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkLastElement: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ checkLastElement: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      MemberExpression(node: TSESTree.MemberExpression) {
        if (!node.computed) {
          return;
        }
        // The receiver used to have to be a bare Identifier, which made
        // `c.path[c.path.length - 1]` and `this.rows[this.rows.length - 1]`
        // invisible — the common shape in class-based and node-tree code. The
        // `.length` half of this expression was already generalised to read
        // `o['length']`; this is the receiver half of the same generalisation.
        if (
          node.object.type !== 'Identifier' &&
          node.object.type !== 'MemberExpression' &&
          node.object.type !== 'ThisExpression'
        ) {
          return;
        }

        // `.at()` RETURNS a value; it is not a reference, so it cannot appear
        // where the element is being written. `arr.at(-1) = 5` is a syntax
        // error, and so are the compound, update and delete forms. Reporting
        // here does not merely add noise — it hands the reader a fix that does
        // not compile.
        //
        // Found by a census of this rule's corpus findings: Shopify's
        // `durationStack[durationStack.length - 1] = (durationStack[...] ?? 0) + d`
        // produced TWO findings on one line, one for the read and one for the
        // assignment target. The read is right; the target never was.
        if (isWriteTarget(node)) {
          return;
        }

        /**
         * Render a receiver as a canonical key path, or null if any segment is
         * dynamic.
         *
         * Comparing raw source text looked equivalent and was not: it made
         * `c["path"][c.path["length"] - 1]` — the same object written two ways
         * — compare unequal, so the rule went silent on a string subscript.
         * `propertyName()` reads `o.k` and `o['k']` identically, which is what
         * the receiver comparison needs.
         */
        const receiverPath = (receiver: TSESTree.Node): string | null => {
          if (receiver.type === 'Identifier') return receiver.name;
          if (receiver.type === 'ThisExpression') return 'this';
          if (receiver.type !== 'MemberExpression') return null;
          const base = receiverPath(receiver.object);
          if (base === null) return null;
          // propertyName() answers null for `this.#rows`; a private name is
          // static too, and its `#` keeps it distinct from a public `rows`.
          const key =
            receiver.property.type === 'PrivateIdentifier'
              ? context.sourceCode.getText(receiver.property)
              : propertyName(receiver);
          return key === null ? null : `${base}.${key}`;
        };

        const arrayName = receiverPath(node.object);
        if (arrayName === null) {
          return;
        }
        // `.at()` is written where the source wrote the receiver, so the
        // rewrite must use the ORIGINAL spelling, not the canonical path.
        const receiverText = context.sourceCode.getText(node.object);

        // Check for array[array.length - n] pattern (any numeric literal n)
        if (
          node.property.type === 'BinaryExpression' &&
          node.property.operator === '-' &&
          node.property.left.type === 'MemberExpression' &&
          receiverPath(node.property.left.object) === arrayName &&
          propertyName(node.property.left) === 'length' &&
          node.property.right.type === 'Literal' &&
          typeof node.property.right.value === 'number' &&
          node.property.right.value > 0
        ) {
          const offset = node.property.right.value;
          const messageId =
            offset === 1 ? 'useAtForLastElement' : 'preferAtMethod';

          // Reported, not rewritten, where the element is called or tagged —
          // see isCalleeOrTag(). Same shape as the variable-offset branch.
          if (isCalleeOrTag(node)) {
            context.report({ node, messageId });
            return;
          }

          context.report({
            node,
            messageId,
            // Every receiver that reaches here rendered to a canonical path,
            // so it is built only from identifiers, `this` and static property
            // names — re-spelling it once cannot move a call or re-evaluate a
            // dynamic index. The rewrite uses the ORIGINAL spelling, not the
            // canonical path, so `c["path"]` stays as the author wrote it.
            fix(fixer: TSESLint.RuleFixer) {
              return fixer.replaceText(node, `${receiverText}.at(-${offset})`);
            },
          });
          return;
        }

        // Check for array[array.length - variable] pattern (variable offset)
        if (
          node.property.type === 'BinaryExpression' &&
          node.property.operator === '-' &&
          node.property.left.type === 'MemberExpression' &&
          receiverPath(node.property.left.object) === arrayName &&
          propertyName(node.property.left) === 'length' &&
          node.property.right.type === 'Identifier'
        ) {
          // Reported, not rewritten. `arr[arr.length - n]` and `arr.at(-n)`
          // agree only while `n` is a positive integer, and nothing here
          // proves that: at `n === 0` the source reads one past the end
          // (undefined) while `.at(-0)` reads the FIRST element, because -0
          // normalises to 0. A negative `n` diverges too. An autofix has to
          // preserve semantics, so this one states the case and leaves the
          // edit to the reader.
          context.report({
            node,
            messageId: 'preferAtMethod',
          });
          return;
        }

        // Check for array[-n] pattern (negative numeric literal)
        if (
          node.property.type === 'UnaryExpression' &&
          node.property.operator === '-' &&
          node.property.argument.type === 'Literal' &&
          typeof node.property.argument.value === 'number' &&
          node.property.argument.value > 0
        ) {
          // Reported, not rewritten — this rewrite INVERTS the value. On an
          // array `arr[-1]` is a plain property read that always yields
          // undefined, while `arr.at(-1)` yields the last element, so the fix
          // turned dead code into live code. Worse, nothing here proves the
          // object is an array: on a `Record<number, string>` holding a `-1`
          // key the source reads a real value, and on that object (or on
          // `arguments`) `.at` does not exist at all, so the rewrite replaces
          // working code with a TypeError. The report stands — `arr[-1]` is
          // almost always a mistake — but naming the mistake is as far as a
          // semantics-preserving fixer can go.
          context.report({
            node,
            messageId: 'useAtForNegativeIndex',
          });
        }
      },
    };
  },
});
