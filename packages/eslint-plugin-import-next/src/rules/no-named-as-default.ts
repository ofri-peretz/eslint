/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-named-as-default
 * Forbid use of exported name as identifier of default export
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import { exportMapOf } from '../utils/export-map';
import type { ExportMap } from '../utils/export-map';
import {
  PARSE_ERROR_MESSAGE,
  reportParseErrors,
} from '../utils/export-map-rules';

type MessageIds = 'namedAsDefault' | 'parseError';

type RuleOptions = [];

/** An import name is an Identifier, or a string literal for an unspellable name. */
const nameOf = (node: TSESTree.Identifier | TSESTree.StringLiteral): string =>
  node.type === 'Identifier' ? node.name : node.value;

/**
 * Does the module, read by parsing it (`../utils/export-map`), export a
 * default AND a different thing named `name`? A module that re-exports one
 * binding as both (`export { a as default, a } from './x'`) does not: the
 * two imports are the same value.
 */
function exportsAlsoNamed(exports: ExportMap, name: string): boolean {
  if (!exports.hasDefault || !exports.has(name)) return false;
  const named = exports.reexports.get(name);
  const fallback = exports.reexports.get('default');
  if (named && fallback && named.local === fallback.local) {
    return named.getImport()?.path !== fallback.getImport()?.path;
  }
  return true;
}

export const noNamedAsDefault = createRule<RuleOptions, MessageIds>({
  name: 'no-named-as-default',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-named-as-default',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-named-as-default.md',
      description:
        'Forbid use of exported name as identifier of default export',
      cwe: 'CWE-1078',
      cvss: 5,
    },
    messages: {
      namedAsDefault: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Named as Default',
        cwe: 'CWE-1078',
        description:
          'Using exported name "{{name}}" as default import may shadow the named export',
        severity: 'MEDIUM',
        fix: 'Use a different name for the default import or import the named export instead',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default.md',
      }),
      parseError: PARSE_ERROR_MESSAGE,
    },
    schema: [],
  },
  defaultOptions: [],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * The collision this rule can see is in THIS file: a module's default is
     * bound to a name, and the file also takes a named export spelled the
     * same way from that module - in the same declaration
     * (`import foo, { foo as f2 }`), in another import, or in a re-export
     * (`export { foo } from './m'`). Deciding the general case - "is `foo` a
     * named export of './m'" - needs to read the other module, which a
     * type-unaware rule does not do.
     *
     * A TYPE of that name (`import type`, `{ type foo }`) is not evidence: a
     * type and a default value sharing a name is a judgment call.
     */
    let defaults: Array<{ source: string; local: string; node: TSESTree.Node }>;
    let namedBySource: Map<string, Set<string>>;

    const addNamed = (source: string, name: string) => {
      let names = namedBySource.get(source);
      if (!names) {
        names = new Set();
        namedBySource.set(source, names);
      }
      names.add(name);
    };

    return {
      before() {
        defaults = [];
        namedBySource = new Map();
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.importKind === 'type') return;
        const source = node.source.value;
        for (const spec of node.specifiers) {
          if (spec.type === 'ImportDefaultSpecifier') {
            defaults.push({ source, local: spec.local.name, node: spec });
            continue;
          }
          if (spec.type !== 'ImportSpecifier' || spec.importKind === 'type') {
            continue;
          }
          // `import { default as foo }` binds the default export exactly as
          // `import foo` does.
          if (nameOf(spec.imported) === 'default') {
            defaults.push({ source, local: spec.local.name, node: spec });
            continue;
          }
          addNamed(source, nameOf(spec.imported));
        }
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (!node.source || node.exportKind === 'type') return;
        for (const spec of node.specifiers) {
          if (spec.exportKind === 'type') continue;
          const name = nameOf(spec.local);
          if (name !== 'default') addNamed(node.source.value, name);
        }
      },
      'Program:exit'() {
        const parsed = new Set<string>();
        for (const { source, local, node } of defaults) {
          const exports = exportMapOf(source, context);
          if (exports && exports.errors.length > 0) {
            if (!parsed.has(source)) {
              parsed.add(source);
              reportParseErrors(
                context,
                (node.parent as TSESTree.ImportDeclaration).source,
                source,
                exports,
              );
            }
            continue;
          }
          if (
            !namedBySource.get(source)?.has(local) &&
            !(exports && exportsAlsoNamed(exports, local))
          ) {
            continue;
          }
          context.report({
            node,
            messageId: 'namedAsDefault',
            data: { name: local },
          });
        }
      },
    };
  },
});
