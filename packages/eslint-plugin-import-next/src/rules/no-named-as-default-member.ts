/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-named-as-default-member
 * Forbid use of exported name as property of default export
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default-member.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'namedAsDefaultMember';

type RuleOptions = [];

/** An import name is an Identifier, or a string literal for an unspellable name. */
const nameOf = (node: TSESTree.Identifier | TSESTree.StringLiteral): string =>
  node.type === AST_NODE_TYPES.Identifier ? node.name : node.value;

export const noNamedAsDefaultMember = createRule<RuleOptions, MessageIds>({
  name: 'no-named-as-default-member',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-named-as-default-member',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-named-as-default-member.md',
      description: 'Forbid use of exported name as property of default export',
      cwe: 'CWE-1078',
      cvss: 2.5,
    },
    messages: {
      namedAsDefaultMember: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Named as Default Member',
        cwe: 'CWE-1078',
        description:
          'Accessing "{{name}}" as property of default import. Import it directly instead',
        severity: 'LOW',
        fix: 'Import the named export directly: import { {{name}} } from "..."',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default-member.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * The default import's BINDING, and the names this file takes from the
     * same module by name (an import, plain or renamed, or a re-export): the
     * evidence that the module exports them. The rule does not read the
     * other module. Accesses are followed through the scope manager, so a
     * parameter that shadows the import is a different value.
     */
    let defaults: Array<{
      source: string;
      spec: TSESTree.ImportDefaultSpecifier | TSESTree.ImportSpecifier;
    }>;
    let namedBySource: Map<string, Set<string>>;

    const addNamed = (source: string, name: string) => {
      let names = namedBySource.get(source);
      if (!names) {
        names = new Set();
        namedBySource.set(source, names);
      }
      names.add(name);
    };

    /** `foo.bar`, `foo['bar']` (a runtime key `foo[k]` names nothing). */
    function memberRead(id: TSESTree.Identifier | TSESTree.JSXIdentifier): {
      node: TSESTree.Node;
      name: string;
    }[] {
      const parent = id.parent;
      if (
        parent.type === AST_NODE_TYPES.MemberExpression &&
        parent.object === id
      ) {
        const name = propertyName(parent);
        return name === null ? [] : [{ node: parent, name }];
      }
      // `const { bar } = foo` reads `bar` off the default.
      // (A reference under a VariableDeclarator is always its `init`.)
      if (
        parent.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.id.type === AST_NODE_TYPES.ObjectPattern
      ) {
        return parent.id.properties.flatMap((property) => {
          if (property.type !== AST_NODE_TYPES.Property) return [];
          const name = objectKeyName(property);
          return name === null ? [] : [{ node: property, name }];
        });
      }
      return [];
    }

    return {
      before() {
        defaults = [];
        namedBySource = new Map();
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.importKind === 'type') return;
        const source = node.source.value;
        for (const spec of node.specifiers) {
          if (spec.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
            defaults.push({ source, spec });
          } else if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
            const imported = nameOf(spec.imported);
            // `import { default as foo }` binds the default like `import foo`.
            if (imported === 'default') defaults.push({ source, spec });
            else if (spec.importKind !== 'type') addNamed(source, imported);
          }
        }
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (!node.source || node.exportKind === 'type') return;
        for (const spec of node.specifiers) {
          if (spec.exportKind === 'type') continue;
          addNamed(node.source.value, nameOf(spec.local));
        }
      },
      'Program:exit'() {
        for (const { source, spec } of defaults) {
          const named = namedBySource.get(source);
          if (!named) continue;
          for (const variable of context.sourceCode.getDeclaredVariables(
            spec,
          )) {
            for (const reference of variable.references) {
              for (const read of memberRead(reference.identifier)) {
                if (!named.has(read.name)) continue;
                context.report({
                  node: read.node,
                  messageId: 'namedAsDefaultMember',
                  data: { name: read.name },
                });
              }
            }
          }
        }
      },
    };
  },
});
