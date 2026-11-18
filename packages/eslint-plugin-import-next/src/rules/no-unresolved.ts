/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unresolved
 * Ensures imports point to resolvable modules (eslint-plugin-import inspired)
 */
import { readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, staticString } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { resolveModule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'unresolvedImport'
  | 'moduleNotFound'
  | 'invalidExtension'
  | 'casingMismatch'
  | 'addIgnoreComment';

export interface Options {
  /** File extensions to consider when resolving imports */
  extensions?: string[];
  /** Ignore certain modules/patterns */
  ignore?: string[];
  /** Allow unresolved imports in certain contexts */
  allowUnresolved?: boolean;
  /**
   * eslint-plugin-import's module-visitor switches. Absent, this rule's own
   * reading: every `import`/`export … from`/`import()` and every `require()`,
   * no AMD. Set, eslint-plugin-import's: `esmodule: false` skips the ES
   * module spellings, `commonjs: false` skips `require()` (and TS
   * `import x = require()`), `amd: true` checks `require([…], fn)` and
   * `define([…], fn)` dependency arrays.
   */
  commonjs?: boolean;
  amd?: boolean;
  esmodule?: boolean;
  /**
   * Report a specifier that resolves only because the file system ignores
   * case (`./MyComponent` naming `myComponent.js` on macOS), which breaks on
   * a case-sensitive one. Off unless set. `caseSensitive` checks the path
   * below the working directory; `caseSensitiveStrict` checks all of it.
   */
  caseSensitive?: boolean;
  caseSensitiveStrict?: boolean;
}

/** Characters that make an `ignore` entry a regular expression. */
const REGEX_SYNTAX = /[\^$\\()[\]{}|+?]/;

/**
 * One `ignore` entry as a predicate. This rule's own forms keep their
 * meaning: `*` matches any run of characters, and a plain string matches
 * exactly or as a path prefix. An entry written as a regular expression
 * (`'\\.svg$'`, `'^@/'`), which is how eslint-plugin-import reads every
 * entry, is matched as one.
 */
function ignoreMatcher(pattern: string): (importPath: string) => boolean {
  // Still matched literally too: an entry that was written as a name
  // before (`'virtual:icons?raw'`) keeps matching that name.
  const literal = (importPath: string) =>
    importPath === pattern || importPath.startsWith(`${pattern}/`);
  // Regex syntax first: eslint-plugin-import reads every entry as a regular
  // expression, so `'^a.*z$'` is one as written — expanding its `*` as this
  // rule's wildcard would turn it into `^a..*z$`. Only an entry with no other
  // regex syntax (`'@scope/*'`) is this rule's own wildcard form.
  const source = REGEX_SYNTAX.test(pattern)
    ? pattern
    : pattern.includes('*')
      ? pattern.replace(/\*/g, '.*')
      : null;
  if (source !== null) {
    try {
      const regex = new RegExp(source);
      return (importPath) => literal(importPath) || regex.test(importPath);
    } catch {
      // Not a valid expression (`'pkg(v1'`, `'@scope/[bad*'`): a literal
      // name after all, rather than a crash that takes the lint run down.
    }
  }
  return literal;
}

type RuleOptions = [Options?];

export const noUnresolved = createRule<RuleOptions, MessageIds>({
  name: 'no-unresolved',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-unresolved.md',
      description: 'Ensures imports point to resolvable modules',
    },
    hasSuggestions: true,
    messages: {
      unresolvedImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Unresolved Import',
        description: 'Import cannot be resolved to a module',
        severity: 'HIGH',
        fix: 'Ensure the module exists or check the import path spelling',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unresolved.md',
      }),
      moduleNotFound: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Module Not Found',
        description: 'Cannot find module or file',
        severity: 'HIGH',
        fix: 'Verify the file exists and the path is correct',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unresolved.md',
      }),
      casingMismatch: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Casing Mismatch',
        description: 'Import casing does not match the underlying filesystem',
        severity: 'HIGH',
        fix: 'Spell the path with the casing of the file on disk',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unresolved.md',
      }),
      invalidExtension: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Invalid File Extension',
        description: 'File extension missing or invalid',
        severity: 'MEDIUM',
        fix: 'Add correct file extension or check if file exists',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unresolved.md',
      }),
      addIgnoreComment: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add to Ignore',
        description: 'Add to ignore list if intentional',
        severity: 'LOW',
        fix: '// eslint-disable-next-line import/no-unresolved',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unresolved.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          extensions: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'File extensions to consider when resolving imports.',
          },
          ignore: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Modules/patterns to ignore during resolution: exact or path prefix, `*` as a wildcard, or a regular expression.',
          },
          allowUnresolved: {
            type: 'boolean',
            default: false,
            description: 'Allow unresolved imports in certain contexts.',
          },
          commonjs: {
            type: 'boolean',
            description:
              'eslint-plugin-import: check `require()` calls (absent: checked).',
          },
          amd: {
            type: 'boolean',
            description:
              'eslint-plugin-import: check AMD `require([...])`/`define([...])` dependencies.',
          },
          esmodule: {
            type: 'boolean',
            description:
              'eslint-plugin-import: check `import`/`export ... from`/`import()` (absent: checked).',
          },
          caseSensitive: {
            type: 'boolean',
            description:
              'Report a specifier whose casing differs from the file on disk, below the working directory.',
          },
          caseSensitiveStrict: {
            type: 'boolean',
            description:
              'Like `caseSensitive`, for the whole path, above the working directory too.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      ignore: [],
      allowUnresolved: false,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let options: Options | undefined;
    let ignore: ((importPath: string) => boolean)[];
    let coreModules: unknown[];
    let checkCase: boolean;
    let strictCase: boolean;
    /** Directory listings for the casing check, per file. */
    let listings: Map<string, string[]>;

    function shouldIgnore(importPath: string): boolean {
      return ignore.some((matches) => matches(importPath));
    }

    function listing(dir: string): string[] {
      let names = listings.get(dir);
      if (!names) {
        names = readdirSync(dir);
        listings.set(dir, names);
      }
      return names;
    }

    /**
     * eslint-plugin-import's `fileExistsWithCaseSync`: every segment of the
     * resolved path, from the file up, must appear with that exact spelling
     * in its parent's listing. A case-insensitive file system resolves a
     * mis-cased specifier; this is what catches it. Without `strict` the walk
     * stops at the process's working directory (upstream's reading, and the
     * same under every engine), whose own spelling is the user's shell's.
     */
    function casingMatches(file: string): boolean {
      const stop = process.cwd().toLowerCase();
      let current = file;
      for (;;) {
        if (!strictCase && current.toLowerCase() === stop) return true;
        const dir = path.dirname(current);
        if (dir === current) return true;
        if (!listing(dir).includes(path.basename(current))) return false;
        current = dir;
      }
    }

    function checkImport(importPath: string, node: TSESTree.Node) {
      // Skip if ignored
      if (shouldIgnore(importPath)) {
        return;
      }

      // A URL scheme (`node:fs`, `virtual:routes`, `bun:test`, `data:...`,
      // `https://...`) names a module the runtime or a bundler provides, not a
      // file the resolver can look for: an unknown, not a finding. One letter
      // is a Windows drive.
      if (/^[a-zA-Z][a-zA-Z0-9+.-]+:/.test(importPath)) {
        return;
      }

      // Skip built-in modules, and the names `import/core-modules` declares
      // as provided by the runtime (`electron`).
      if (
        builtinModules.includes(importPath) ||
        coreModules.includes(importPath)
      ) {
        return;
      }

      const filePath = context.filename;
      const resolved = resolveModule(importPath, filePath, {
        extensions: options?.extensions,
      });

      if (!resolved) {
        context.report({
          node,
          messageId: 'moduleNotFound',
          data: {
            importPath,
            suggestion:
              'Check if the file exists, verify the path, or add to ignore list',
          },
          suggest: [
            {
              messageId: 'addIgnoreComment',
              fix(fixer: TSESLint.RuleFixer) {
                // Find the statement that contains this import
                let statement = node;
                while (
                  statement.parent &&
                  statement.parent.type !== 'Program'
                ) {
                  if (
                    [
                      'ImportDeclaration',
                      'VariableDeclaration',
                      'ExpressionStatement',
                      'ExportNamedDeclaration',
                      'ExportAllDeclaration',
                    ].includes(statement.parent.type)
                  ) {
                    statement = statement.parent;
                    break;
                  }
                  statement = statement.parent;
                }

                return fixer.insertTextBefore(
                  statement,
                  '// eslint-disable-next-line import-next/no-unresolved\n',
                );
              },
            },
          ],
        });
      } else if (checkCase && !casingMatches(resolved)) {
        context.report({
          node,
          messageId: 'casingMismatch',
          data: { importPath },
        });
      }
    }

    /** AMD `require([...], fn)` / `define([...], fn)`: each named dependency. */
    function checkAmd(node: TSESTree.CallExpression) {
      const [dependencies] = node.arguments;
      if (
        node.callee.type !== 'Identifier' ||
        (node.callee.name !== 'require' && node.callee.name !== 'define') ||
        node.arguments.length !== 2 ||
        dependencies.type !== 'ArrayExpression'
      ) {
        return;
      }
      for (const element of dependencies.elements) {
        if (
          element?.type === 'Literal' &&
          typeof element.value === 'string' &&
          // RequireJS's magic modules, never files.
          element.value !== 'require' &&
          element.value !== 'exports'
        ) {
          checkImport(element.value, element);
        }
      }
    }

    let esmodule: boolean;
    let commonjs: boolean;
    let amd: boolean;

    return {
      before() {
        [options] = context.options;
        const {
          allowUnresolved = false,
          caseSensitive = false,
          caseSensitiveStrict = false,
        } = options || {};
        ignore = (options?.ignore ?? []).map(ignoreMatcher);
        coreModules = (context.settings['import/core-modules'] ??
          []) as unknown[];
        esmodule = options?.esmodule !== false;
        commonjs = options?.commonjs !== false;
        amd = options?.amd === true;
        strictCase = caseSensitiveStrict;
        checkCase = caseSensitive || caseSensitiveStrict;
        listings = new Map();

        // If allowUnresolved is true, don't check anything
        if (allowUnresolved) {
          return false;
        }
        return true;
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (!esmodule) return;
        const importPath = node.source.value;

        if (typeof importPath === 'string') {
          checkImport(importPath, node.source);
        }
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (!esmodule) return;
        if (node.source && typeof node.source.value === 'string') {
          checkImport(node.source.value, node.source);
        }
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        if (!esmodule) return;
        if (node.source && typeof node.source.value === 'string') {
          checkImport(node.source.value, node.source);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (amd) checkAmd(node);
        // Check require() calls
        if (
          commonjs &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          const staticText = staticString(arg);
          if (staticText !== null) {
            checkImport(staticText, arg);
          }
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        // Handle dynamic imports: import("module")
        if (
          esmodule &&
          node.source.type === 'Literal' &&
          typeof node.source.value === 'string'
        ) {
          checkImport(node.source.value, node.source);
        }
      },

      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        // Handle TypeScript import = require() syntax
        if (
          commonjs &&
          node.moduleReference.type === 'TSExternalModuleReference' &&
          node.moduleReference.expression.type === 'Literal' &&
          typeof node.moduleReference.expression.value === 'string'
        ) {
          checkImport(
            node.moduleReference.expression.value,
            node.moduleReference,
          );
        }
      },
    };
  },
});
