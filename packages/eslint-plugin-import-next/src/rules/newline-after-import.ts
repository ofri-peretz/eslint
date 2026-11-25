/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { createRule, TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'newlineAfterImport';

/** eslint-plugin-import's options, with its meaning. */
export interface Options {
  /** Empty lines required after the last import. Default 1. */
  count?: number;
  /** Require exactly `count` empty lines, not at least. Default false. */
  exactCount?: boolean;
  /** Measure to a comment that follows the imports. Default false. */
  considerComments?: boolean;
}

export type RuleOptions = [Options?];

type ImportNode =
  TSESTree.ImportDeclaration | TSESTree.TSImportEqualsDeclaration;

/** A node whose body runs later, or not at the top level: `require()` in one is not an import. */
const NESTING = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'BlockStatement',
  'ObjectExpression',
  'Decorator',
]);

const contains = (outer: TSESTree.Node, inner: TSESTree.Node): boolean =>
  outer.range[0] <= inner.range[0] && outer.range[1] >= inner.range[1];

/** `require('x')` with one string-literal argument. */
function isStaticRequire(node: TSESTree.CallExpression): boolean {
  const [arg] = node.arguments;
  return (
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1 &&
    arg.type === 'Literal' &&
    typeof arg.value === 'string'
  );
}

/**
 * Where the blank lines are measured to: a decorated class is measured to its
 * first decorator, which is where it starts on the page.
 */
function startOf(next: TSESTree.Node): TSESTree.Node {
  const declaration =
    (next.type === 'ExportDefaultDeclaration' ||
      next.type === 'ExportNamedDeclaration') &&
    next.declaration?.type === 'ClassDeclaration'
      ? next.declaration
      : next;
  const decorators = (declaration as { decorators?: TSESTree.Decorator[] })
    .decorators;
  return declaration.type === 'ClassDeclaration' && decorators?.length
    ? decorators[0]
    : next;
}

export const newlineAfterImport = createRule<RuleOptions, MessageIds>({
  name: 'newline-after-import',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/newline-after-import',
    },
    type: 'layout',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/newline-after-import.md',
      description: 'Enforce a newline after import statements',
    },
    fixable: 'whitespace',
    messages: {
      newlineAfterImport: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Newline After Import',
        description: 'Require a newline after the last import statement',
        severity: 'LOW',
        fix: 'Add a newline after the import block',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/newline-after-import.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          count: {
            type: 'integer',
            minimum: 1,
            description:
              'Empty lines required after the last import. Default 1.',
          },
          exactCount: {
            type: 'boolean',
            description: 'Require exactly `count` empty lines, not at least.',
          },
          considerComments: {
            type: 'boolean',
            description:
              'Measure to a comment that follows the imports, not only to the next statement.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  /*
   * Ported from eslint-plugin-import's `newline-after-import` (MIT), so its
   * options mean the same: `count` blank lines after the last import (or
   * top-level `require()`) that is not followed by another, at least or —
   * with `exactCount` — exactly; `considerComments` measures to a comment
   * that follows.
   */
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let count: number;
    let exactCount: boolean;
    let considerComments: boolean;
    let requireCalls: TSESTree.CallExpression[];

    function report(node: TSESTree.Node, lineDifference: number): void {
      const expected = count + 1;
      context.report({
        loc: {
          line: node.loc.end.line,
          column:
            node.loc.start.line === node.loc.end.line
              ? node.loc.start.column
              : 0,
        },
        messageId: 'newlineAfterImport',
        // Too many blank lines under `exactCount`: removing them is not a
        // whitespace insert, so it is reported without a fix.
        fix:
          lineDifference > expected
            ? null
            : (fixer: TSESLint.RuleFixer) =>
                fixer.insertTextAfter(
                  node,
                  '\n'.repeat(expected - lineDifference),
                ),
      });
    }

    function checkNext(node: TSESTree.Node, next: TSESTree.Node): void {
      const lineDifference = startOf(next).loc.start.line - node.loc.end.line;
      if (
        lineDifference < count + 1 ||
        (exactCount && lineDifference !== count + 1)
      ) {
        report(node, lineDifference);
      }
    }

    /** With `considerComments`, the comment within reach after `node`. */
    function commentAfter(
      node: TSESTree.Node,
      endLine: number,
    ): TSESTree.Comment | undefined {
      if (!considerComments || node.parent?.type !== 'Program') return;
      return context.sourceCode
        .getAllComments()
        .find(
          (c) =>
            c.loc.start.line >= endLine &&
            c.loc.start.line <= endLine + count + 1,
        );
    }

    function checkComment(
      node: TSESTree.Node,
      comment: TSESTree.Comment,
    ): void {
      const lineDifference = comment.loc.start.line - node.loc.end.line;
      if (lineDifference < count + 1) report(node, lineDifference);
    }

    function checkImport(node: ImportNode): void {
      // `export import a = b.c` sits in an ExportNamedDeclaration, which has
      // no body, so it is an export and is left alone. A namespace alias
      // (`import Alias = NS.Inner`) loads no module: not an import either.
      if (
        node.type === 'TSImportEqualsDeclaration' &&
        node.moduleReference.type !== 'TSExternalModuleReference'
      )
        return;
      const body = (node.parent as { body?: TSESTree.Node[] }).body;
      if (!Array.isArray(body)) return;
      const next = body[body.indexOf(node) + 1];
      const comment = commentAfter(node, node.loc.end.line);
      if (comment) {
        checkComment(node, comment);
      } else if (
        next &&
        next.type !== 'ImportDeclaration' &&
        next.type !== 'TSImportEqualsDeclaration'
      ) {
        checkNext(node, next);
      }
    }

    return {
      before() {
        // `defaultOptions` is `[{}]`, so the merged first option is always an
        // object.
        ({
          count = 1,
          exactCount = false,
          considerComments = false,
        } = currentOptions()[0] as Options);
        requireCalls = [];
      },
      ImportDeclaration: checkImport,
      TSImportEqualsDeclaration: checkImport,
      CallExpression(node: TSESTree.CallExpression) {
        if (!isStaticRequire(node)) return;
        for (let p: TSESTree.Node | undefined = node.parent; p; p = p.parent) {
          if (NESTING.has(p.type)) return;
        }
        requireCalls.push(node);
      },
      'Program:exit'(program: TSESTree.Program) {
        requireCalls.forEach((call, index) => {
          const position = program.body.findIndex((s) => contains(s, call));
          const statement = program.body[position];
          const next = program.body[position + 1];
          const nextCall = requireCalls[index + 1];
          if (nextCall && contains(statement, nextCall)) return;
          if (!next || (nextCall && contains(next, nextCall))) return;
          const comment = commentAfter(statement, call.loc.end.line);
          if (comment) checkComment(statement, comment);
          else checkNext(statement, next);
        });
      },
    };
  },
});
