/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-useless-path-segments
 * Forbid unnecessary path segments in import and require statements
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-useless-path-segments.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  resolveModule,
} from '@interlace/eslint-devkit';
import * as path from 'node:path';

type MessageIds = 'uselessPathSegments';

export interface Options {
  /** Don't report on direct parent: imports (../) */
  noUselessIndex?: boolean;
  /** Check CommonJS require(). Default: true */
  commonjs?: boolean;
}

type RuleOptions = [Options?];

export const noUselessPathSegments = createRule<RuleOptions, MessageIds>({
  name: 'no-useless-path-segments',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-useless-path-segments.md',
      description:
        'Forbid unnecessary path segments in import and require statements',
      cwe: 'CWE-1078',
      cvss: 2.5,
    },
    fixable: 'code',
    messages: {
      uselessPathSegments: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Useless Path Segments',
        cwe: 'CWE-1078',
        description: 'Useless path segments in import: {{importPath}}',
        severity: 'LOW',
        fix: 'Simplify to: {{simplifiedPath}}',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-useless-path-segments.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          noUselessIndex: { type: 'boolean', default: false },
          commonjs: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ noUselessIndex: false, commonjs: true }],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let noUselessIndex: boolean;
    let commonjs: boolean;

    function simplifyPath(importPath: string): string | null {
      // Only process relative paths
      if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
        return null;
      }
      // A trailing slash only matches a directory, so `./lib/` can name a
      // different module than `./lib` (a sibling `lib.ts`). Not provably
      // useless: leave it alone.
      if (importPath.endsWith('/')) return null;

      // Lexical normalisation: `./a/./b`, `./a/../b`, `./a//b` -> `./b`.
      let simplified = path.posix.normalize(importPath);

      // A path that leaves the file's directory only to come back into it:
      // from `src/app.ts`, `../src/dep` is `./dep`. Node resolves a relative
      // specifier against the importing file's directory, so this is the same
      // module by construction.
      const file = path.resolve(context.cwd, context.filename);
      if (simplified.startsWith('../')) {
        const fileDir = path.posix.dirname(file.split(path.sep).join('/'));
        const relative = path.posix.relative(
          fileDir,
          path.posix.join(fileDir, simplified),
        );
        if (!relative.startsWith('../')) simplified = relative || '.';
      }

      // Ensure relative paths start with ./ (`posix.normalize` drops it, and a
      // first segment may itself start with a dot: `.config/x`).
      if (
        simplified !== '.' &&
        simplified !== '..' &&
        !simplified.startsWith('./') &&
        !simplified.startsWith('../')
      ) {
        simplified = './' + simplified;
      }

      // Remove a trailing extensionless `/index` when that names the same
      // module: `./foo/index` -> `./foo` is only safe when `./foo` does not
      // resolve to a sibling `foo.ts` instead. Both must resolve, to the same
      // file: an unresolvable path proves nothing.
      if (noUselessIndex && simplified.endsWith('/index')) {
        const stripped = simplified.slice(0, -'/index'.length);
        const target = resolveModule(simplified, file);
        if (target !== null && target === resolveModule(stripped, file)) {
          simplified = stripped;
        }
      }

      // If nothing changed, return null
      if (simplified === importPath) {
        return null;
      }

      return simplified;
    }

    function checkImport(source: TSESTree.Literal) {
      const importPath = source.value;
      if (typeof importPath !== 'string') return;

      const simplified = simplifyPath(importPath);
      if (simplified) {
        context.report({
          node: source,
          messageId: 'uselessPathSegments',
          data: {
            importPath,
            simplifiedPath: simplified,
          },
          fix(fixer: TSESLint.RuleFixer) {
            const quote = source.raw?.charAt(0) || "'";
            return fixer.replaceText(source, `${quote}${simplified}${quote}`);
          },
        });
      }
    }

    return {
      before() {
        const options = context.options[0] || {};
        ({ noUselessIndex = false, commonjs = true } = options);
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        checkImport(node.source);
      },

      // `export { a } from './x'` and `export * from './x'` load a module by
      // the same specifier an import does.
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source) checkImport(node.source);
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        checkImport(node.source);
      },

      // TS `import x = require('./x')` compiles to `require()`: it follows the
      // `commonjs` option like a `require()` call.
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (!commonjs) return;
        const ref = node.moduleReference;
        // The parser only accepts a string literal inside `require(...)` here.
        if (ref.type === AST_NODE_TYPES.TSExternalModuleReference) {
          checkImport(ref.expression as TSESTree.Literal);
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        if (node.source.type === AST_NODE_TYPES.Literal) {
          checkImport(node.source as TSESTree.Literal);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (!commonjs) return;

        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal
        ) {
          checkImport(node.arguments[0] as TSESTree.Literal);
        }
      },
    };
  },
});
