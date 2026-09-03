/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-cryptojs
 * Warns on usage of deprecated crypto-js library
 * CWE-1104: Use of Unmaintained Third Party Components
 *
 * crypto-js is not maintained since 2022 and recommends using native crypto
 * @see https://www.npmjs.com/package/crypto-js
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  isModuleBinding,
} from '@interlace/eslint-devkit';

import { resolveConstantString } from '../../utils/const-value';
import { findVariable } from '../../utils/provenance';

/**
 * @vocabulary `crypto-js` is the package name on npm and `require` is
 * CommonJS. Matching them is matching a published module identifier.
 *
 * @see https://www.npmjs.com/package/crypto-js
 */
type MessageIds = 'deprecatedCryptojs';

type SourceCode = TSESLint.SourceCode;

/**
 * Is this expression `createRequire(...)`?
 *
 * Resolved through the module binding, never through the callee's spelling, so
 * `import { createRequire } from 'node:module'`, `import module from 'module'`
 * + `module.createRequire(…)` and `const { createRequire } = require('module')`
 * all answer the same.
 */
function isCreateRequireCall(
  sourceCode: SourceCode,
  node: TSESTree.Node | null | undefined,
): boolean {
  if (!node || node.type !== AST_NODE_TYPES.CallExpression) return false;
  return isModuleBinding(node.callee, sourceCode.getScope(node), 'module', [
    'createRequire',
  ]);
}

/**
 * Does this callee load a CommonJS module?
 *
 * Two things the old `callee.name === 'require'` test got wrong, in opposite
 * directions:
 *
 * - **False negative.** An ESM file that needs a CommonJS-only package writes
 *   `const load = createRequire(import.meta.url); load('crypto-js')`. The loader
 *   is bound to a local name, so nothing in the call is spelled `require`, and
 *   the dependency was invisible.
 * - **False positive.** A file that declares its OWN `require` — a stub
 *   registry in a test helper, a bundle evaluator in a build script — is not
 *   loading anything from npm. The old test reported on the spelling of a local
 *   function.
 *
 * Node's real CommonJS `require` is injected into the module wrapper and has no
 * declaration in the file, so "the name resolves to nothing" is the normal
 * positive case. `declare const require: NodeRequire` (a variable with no
 * function initializer) is kept, because that is a type declaration for the
 * same injected global.
 */
function isRequireCallee(
  sourceCode: SourceCode,
  callee: TSESTree.Node,
): boolean {
  if (callee.type !== AST_NODE_TYPES.Identifier) return false;
  const def = findVariable(sourceCode, callee)?.defs[0];

  if (
    def?.type === 'Variable' &&
    isCreateRequireCall(sourceCode, def.node.init)
  )
    return true;

  if (callee.name !== 'require') return false;
  if (def === undefined) return true;
  return (
    def.type === 'Variable' &&
    def.node.init?.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
    def.node.init?.type !== AST_NODE_TYPES.FunctionExpression
  );
}

/**
 * Every syntactic site where a module specifier enters a file, handed to
 * `judge` as a plain string.
 *
 * The rule used to visit `ImportDeclaration` and `require()` only, which is two
 * of the six ways a dependency arrives. `import()`, `export … from`,
 * `export * from` and TypeScript's `import x = require(…)` all bind the same
 * package and all were silent. The specifier itself goes through
 * `resolveConstantString`, so a specifier hoisted to a `const` — ordinary style
 * in a file that lists its vendored packages — reads the same as an inline
 * literal.
 */
function moduleSpecifierListener(
  sourceCode: SourceCode,
  judge: (node: TSESTree.Node, specifier: string) => void,
): TSESLint.RuleListener {
  const fromExpression = (
    report: TSESTree.Node,
    source: TSESTree.Node | null | undefined,
  ): void => {
    if (!source) return;
    const resolved = resolveConstantString(sourceCode, source);
    if (resolved !== null) judge(report, resolved.value);
  };

  return {
    ImportDeclaration: (node: TSESTree.ImportDeclaration) =>
      fromExpression(node, node.source),
    ImportExpression: (node: TSESTree.ImportExpression) =>
      fromExpression(node, node.source),
    ExportNamedDeclaration: (node: TSESTree.ExportNamedDeclaration) =>
      fromExpression(node, node.source),
    ExportAllDeclaration: (node: TSESTree.ExportAllDeclaration) =>
      fromExpression(node, node.source),
    TSImportEqualsDeclaration: (node: TSESTree.TSImportEqualsDeclaration) => {
      if (
        node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference
      ) {
        fromExpression(node, node.moduleReference.expression);
      }
    },
    CallExpression: (node: TSESTree.CallExpression) => {
      if (node.arguments.length === 0) return;
      if (!isRequireCallee(sourceCode, node.callee)) return;
      fromExpression(node, node.arguments[0]);
    },
  };
}

/**
 * No options.
 *
 * A `severity: 'error' | 'warn'` option used to sit here, defaulted in both the
 * schema and `defaultOptions` and documented in `docs/rules/no-cryptojs.md` as
 * "Severity level for reports". `create()` never read it, and no rule can:
 * ESLint takes severity from the config entry (`'…/no-cryptojs': 'error'`), not
 * from rule options. A consumer who set `severity: 'error'` got warn-level
 * reports and a schema that accepted the setting without complaint. Deleted, so
 * that config fails loudly instead of lying quietly.
 */
export type Options = Record<string, never>;

type RuleOptions = [Options?];

export const noCryptojs = createRule<RuleOptions, MessageIds>({
  name: 'no-cryptojs',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-cryptojs.md',
      description:
        'Disallow deprecated crypto-js library (use native crypto instead)',
      cwe: 'CWE-1104',
      cvss: 5.3,
    },
    messages: {
      deprecatedCryptojs: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Deprecated crypto-js library',
        cwe: 'CWE-1104',
        description:
          'crypto-js is no longer maintained (last update: 2022). Future vulnerabilities will not be patched.',
        severity: 'MEDIUM',
        fix: 'Migrate to native Node.js crypto module or Web Crypto API',
        documentationLink: 'https://nodejs.org/api/crypto.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return moduleSpecifierListener(context.sourceCode, (node, specifier) => {
      // Exact package, or a subpath of it. Never a substring test: a local
      // `./crypto-js-shim` and the package `crypto-js-x` are different modules.
      if (specifier === 'crypto-js' || specifier.startsWith('crypto-js/')) {
        context.report({ node, messageId: 'deprecatedCryptojs' });
      }
    });
  },
});

export type { Options as NoCryptojsOptions };
