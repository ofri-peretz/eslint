/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: enforce-node-protocol-usage
 * Enforce either using, or omitting, the `node:` protocol when importing
 * Node.js builtin modules.
 *
 * eslint-plugin-import's rule of the same name, with its options: `'always'`
 * asks for `node:fs`, `'never'` for `fs`. `prefer-node-protocol` is the
 * one-way version with no option.
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/enforce-node-protocol-usage.md
 */
import { builtinModules } from 'node:module';

import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  staticString,
} from '@interlace/eslint-devkit';

type MessageIds = 'requireNodeProtocol' | 'forbidNodeProtocol';

export type Mode = 'always' | 'never';
type RuleOptions = [Mode];

/**
 * Node's own list of builtin modules, subpaths included (`fs/promises`). A
 * builtin that exists only with the scheme is listed already prefixed
 * (`node:test`), so its bare name is never taken for one: `node:test` is not
 * reported under `'never'`, because `test` would load a different module.
 *
 * @vocabulary Node.js — https://nodejs.org/api/module.html#modulebuiltinmodules
 */
const NODE_BUILT_INS = new Set(builtinModules);

/** eslint-plugin-import's `import/node-version` format: `"16.0.0"`. */
const NODE_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export const enforceNodeProtocolUsage = createRule<RuleOptions, MessageIds>({
  name: 'enforce-node-protocol-usage',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/enforce-node-protocol-usage.md',
      description:
        'Enforce either using, or omitting, the `node:` protocol when importing Node.js builtin modules',
    },
    fixable: 'code',
    messages: {
      requireNodeProtocol: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Node.js Protocol Missing',
        description: 'Prefer `node:{{moduleName}}` over `{{moduleName}}`',
        severity: 'LOW',
        fix: 'Write "node:{{moduleName}}"',
        documentationLink:
          'https://nodejs.org/api/modules.html#built-in-modules-with-mandatory-node-prefix',
      }),
      forbidNodeProtocol: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Node.js Protocol Present',
        description: 'Prefer `{{moduleName}}` over `node:{{moduleName}}`',
        severity: 'LOW',
        fix: 'Write "{{moduleName}}"',
        documentationLink:
          'https://nodejs.org/api/modules.html#built-in-modules',
      }),
    },
    // eslint-plugin-import's schema: the mode is required.
    schema: {
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: [{ type: 'string', enum: ['always', 'never'] }],
    },
  },
  defaultOptions: ['always'],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let mode: Mode;

    function check(source: TSESTree.Node | null | undefined) {
      // eslint-plugin-import reads a quoted specifier only; a template
      // literal, even a static one, is left alone.
      if (!source || source.type === 'TemplateLiteral') return;
      const moduleName = staticString(source);
      if (moduleName === null) return;

      if (mode === 'never') {
        if (!moduleName.startsWith('node:')) return;
        const bare = moduleName.slice('node:'.length);
        if (!NODE_BUILT_INS.has(bare)) return;
        context.report({
          node: source,
          messageId: 'forbidNodeProtocol',
          data: { moduleName: bare },
          fix: (fixer: TSESLint.RuleFixer) =>
            fixer.removeRange([source.range[0] + 1, source.range[0] + 6]),
        });
        return;
      }

      if (moduleName.startsWith('node:') || !NODE_BUILT_INS.has(moduleName))
        return;
      context.report({
        node: source,
        messageId: 'requireNodeProtocol',
        data: { moduleName },
        fix: (fixer: TSESLint.RuleFixer) =>
          fixer.insertTextAfterRange(
            [source.range[0], source.range[0] + 1],
            'node:',
          ),
      });
    }

    return {
      before() {
        const settings: Record<string, unknown> = context.settings;
        const nodeVersion = settings['import/node-version'];
        if (
          nodeVersion !== undefined &&
          (typeof nodeVersion !== 'string' || !NODE_VERSION.test(nodeVersion))
        ) {
          throw new TypeError(
            '`import/node-version` setting must be a string in the format "10.23.45" (a semver version, with no leading zero)',
          );
        }
        mode = context.options[0] === 'never' ? 'never' : 'always';
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        check(node.source);
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        check(node.source);
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        check(node.source);
      },
      ImportExpression(node: TSESTree.ImportExpression) {
        check(node.source);
      },
      // TS `import fs = require('fs')` loads the module the way require() does.
      TSExternalModuleReference(node: TSESTree.TSExternalModuleReference) {
        check(node.expression);
      },
      // `require('fs')`: the global, called directly with exactly one
      // argument. `require?.('fs')`, `foo.require('fs')` and
      // `require.resolve('fs')` are not module loads this rule judges.
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.optional ||
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'require' ||
          node.arguments.length !== 1
        )
          return;
        check(node.arguments[0]);
      },
    };
  },
});
