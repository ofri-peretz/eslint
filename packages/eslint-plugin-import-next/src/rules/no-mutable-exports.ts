/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-mutable-exports
 * Forbid the use of mutable exports with `var` or `let` (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'mutableExport' | 'varExport' | 'letExport';

export interface Options {
  /** Allow mutable exports in specific files */
  allowInFiles?: string[];
  /** Ignore specific export names */
  ignoreExports?: string[];
}

type RuleOptions = [Options?];

export const noMutableExports = createRule<RuleOptions, MessageIds>({
  name: 'no-mutable-exports',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-mutable-exports.md',
      description: 'Forbid the use of mutable exports with `var` or `let`',
    },
    hasSuggestions: false,
    messages: {
      mutableExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Mutable Export',
        description: 'Export uses mutable declaration that can be reassigned',
        severity: 'MEDIUM',
        fix: 'Use const for exports to ensure immutability',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-mutable-exports.md',
      }),
      varExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Var Export',
        description: 'Export declared with var can be reassigned',
        severity: 'MEDIUM',
        fix: 'Change var to const for better predictability',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-mutable-exports.md',
      }),
      letExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Let Export',
        description: 'Export declared with let can be reassigned',
        severity: 'MEDIUM',
        fix: 'Change let to const if value never changes',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-mutable-exports.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'File patterns where mutable exports are allowed',
          },
          ignoreExports: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific export names to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInFiles: [],
      ignoreExports: [],
    },
  ],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { allowInFiles = [], ignoreExports = [] } = options || {};

    const filename = context.filename;
    if (!filename) {
      return {};
    }

    function shouldSkipFile(): boolean {
      return allowInFiles.some((pattern: string) => filename.includes(pattern));
    }

    function shouldIgnoreExport(exportName: string): boolean {
      return ignoreExports.includes(exportName);
    }

    function reportMutableExport(
      node: TSESTree.Node,
      exportName: string,
      declarationKind: 'var' | 'let',
    ) {
      if (shouldSkipFile() || shouldIgnoreExport(exportName)) {
        return;
      }

      const messageId = declarationKind === 'var' ? 'varExport' : 'letExport';

      context.report({
        node,
        messageId,
      });
    }

    function checkPattern(
      node: TSESTree.BindingName,
      kind: 'var' | 'let',
      reportNode: TSESTree.Node = node,
    ) {
      if (node.type === 'Identifier') {
        reportMutableExport(reportNode, node.name, kind);
      } else if (node.type === 'ObjectPattern') {
        node.properties.forEach((prop: TSESTree.RestElement | TSESTree.Property) => {
          if (prop.type === 'Property' && prop.value) {
            checkPattern(prop.value as TSESTree.BindingName, kind, prop.key);
          } else if (prop.type === 'RestElement') {
            checkPattern(prop.argument as TSESTree.BindingName, kind, prop);
          }
        });
      } else if (node.type === 'ArrayPattern') {
        node.elements.forEach((element: TSESTree.DestructuringPattern | null) => {
          if (element) {
            checkPattern(element as TSESTree.BindingName, kind, element);
          }
        });
      }
    }

    /**
     * The `var`/`let` declaration a name resolves to, if that is what it is.
     *
     * `export { x }` names a BINDING, so the question is which declaration
     * that name resolves to — not whether the characters `export { x }`
     * appear somewhere in the file.
     *
     * An export declaration is only legal at the top level, so there is no
     * scope chain to walk: the name is either in the module scope or is not
     * declared in this file at all.
     */
    function mutableDeclaration(
      node: TSESTree.Node,
      name: string,
    ): { id: TSESTree.Identifier; kind: 'var' | 'let' } | null {
      const variable = context.sourceCode.getScope(node).set.get(name);
      if (!variable) return null;

      for (const def of variable.defs) {
        // An `import`ed binding re-exported unchanged is the exporting
        // module's business, not this one's.
        if (def.type !== 'Variable') continue;
        const { kind } = def.parent;
        if (kind === 'var' || kind === 'let') return { id: def.name, kind };
      }
      return null;
    }

    return {
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.declaration?.type === 'VariableDeclaration') {
          const { kind, declarations } = node.declaration;
          if (kind !== 'var' && kind !== 'let') {
            return;
          }
          declarations.forEach((decl: TSESTree.VariableDeclarator) => {
            checkPattern(decl.id, kind);
          });
          return;
        }

        // `export { x } from './m'` re-exports another module's binding. It
        // says nothing about anything declared here, and a local `let x`
        // that happens to share the name is unrelated.
        if (node.source) {
          return;
        }

        for (const specifier of node.specifiers) {
          // `local` can only be a string literal in a re-export
          // (`export { "a" as b } from './m'`), and those returned above.
          const declaration = mutableDeclaration(node, (specifier.local as TSESTree.Identifier).name);
          if (!declaration) continue;

          // The option is spelled `ignoreExports`, so it matches the name the
          // module publishes — `bar` in `export { foo as bar }`.
          const exported =
            specifier.exported.type === 'Identifier'
              ? specifier.exported.name
              : specifier.exported.value;

          reportMutableExport(declaration.id, exported, declaration.kind);
        }
      },
    };
  },
});
