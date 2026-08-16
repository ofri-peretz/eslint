/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect potential typosquatting in dependencies
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/506.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  resolveModuleBinding,
  unwrapTypeSyntax,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

import { constInitializerOf, resolveConstantString } from '../../utils/const-value';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const detectSuspiciousDependencies = createRule<RuleOptions, MessageIds>({
  name: 'detect-suspicious-dependencies',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/detect-suspicious-dependencies.md',
      description: 'Detect typosquatting in package names',
      cwe: 'CWE-506',
      cvss: 9.8,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Suspicious Dependency',
        cwe: 'CWE-506',
        description: 'Suspicious package name detected - possible typosquatting',
        severity: 'HIGH',
        fix: 'Verify package authenticity on npm registry',
        documentationLink: 'https://cwe.mitre.org/data/definitions/506.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const popularPackages = ['react', 'lodash', 'express', 'axios', 'webpack'];

    /**
     * Real packages that happen to sit close to a popular name.
     *
     * Edit distance alone cannot tell a typosquat from a package that simply
     * has a similar name. `preact` is one character from `react` and is a
     * legitimate dependency of okta/okta-signin-widget, where this rule
     * reported it as a possible attack; `recast` is two from `react` and is
     * the AST library jscodeshift is built on.
     *
     * Accusing a real dependency of being malware is far more costly than
     * missing a squat, so a name has to clear this list before it is reported.
     */
    const KNOWN_LEGITIMATE = new Set([
      'preact', 'recast', 'react-dom', 'reactor', 'redux',
      'lodash-es', 'expressive', 'axios-retry', 'webpack-cli',
    ]);
    
    // oxlint-disable-next-line consistent-function-scoping
    function levenshtein(a: string, b: string): number {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
            // Damerau: a transposition is a single slip of the fingers, not
            // two edits. Without this, `raect` scores 2 against `react` and a
            // threshold of 1 would miss the most common squat shape there is.
            if (
              i > 1 &&
              j > 1 &&
              b.charAt(i - 1) === a.charAt(j - 2) &&
              b.charAt(i - 2) === a.charAt(j - 1)
            ) {
              matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
            }
          }
        }
      }
      return matrix[b.length][a.length];
    }
    
    /**
     * Judge one loaded specifier, whatever syntax loaded it.
     *
     * Extracted because this rule used to register `ImportDeclaration` and
     * nothing else — its only visitor. A typosquatted dependency pulled in the
     * way most Node packages pull in dependencies, `require('reqeust')`, was
     * not merely under-reported: the rule had no path that could ever see it.
     */
    const checkSpecifier = (node: TSESTree.Node, source: string): void => {
      // Relative paths are not packages, and a scoped name is namespaced by its
      // owner — neither can be a registry typosquat of a bare package name.
      if (source.startsWith('.') || source.startsWith('@')) return;
      // Everything after the first `/` is a path INSIDE an already-resolved
      // package, so `loadsh/fp` installs the same impostor as `loadsh` while
      // `lodash/debounce.js` is an ordinary deep import of the real thing.
      // Comparing the whole specifier got both backwards: the squat's distance
      // was inflated past the threshold and the deep import's was too.
      const name = source.slice(0, source.indexOf('/') === -1 ? source.length : source.indexOf('/'));
      for (const popular of popularPackages) {
        const distance = levenshtein(name, popular);
        // Distance 2 sweeps in too much genuine code — `recast` is two
        // edits from `react`. A real typosquat is a single slip:
        // transposition, doubling, or one wrong key.
        if (distance === 1 && !KNOWN_LEGITIMATE.has(name)) {
          context.report({
            node,
            messageId: 'violationDetected',
            data: { name, similar: popular },
          });
        }
      }
    };

    /**
     * Judge a specifier written as an EXPRESSION rather than a bare literal.
     *
     * `require('loadsh' as string)` and `const PKG = 'loadsh'; require(PKG)`
     * load precisely the same impostor as `require('loadsh')`. The rule used to
     * demand `arg.type === 'Literal'` at the call site, so hoisting a dependency
     * name to a module constant — ordinary style, not obfuscation — removed the
     * finding entirely. Resolution is one `const` hop through scope analysis, so
     * a reassignable `let` or a parameter still yields nothing rather than a guess.
     */
    const checkExpression = (node: TSESTree.Node, specifier: TSESTree.Node): void => {
      const resolved = resolveConstantString(context.sourceCode, unwrapTypeSyntax(specifier));
      if (resolved === null) return;
      checkSpecifier(node, resolved.value);
    };

    /**
     * Is this callee the CommonJS module loader?
     *
     * `require` by name, or a binding initialised from `module.createRequire()`
     * — the documented way an ESM file loads a CommonJS dependency, and a call
     * whose callee is therefore never literally spelled `require`. Resolved
     * through `resolveModuleBinding`, so the answer comes from where the value
     * came from, never from how the local variable happens to be spelled.
     */
    const isModuleLoader = (callee: TSESTree.Node): boolean => {
      if (callee.type !== AST_NODE_TYPES.Identifier) return false;
      if (callee.name === 'require') return true;
      const init = constInitializerOf(context.sourceCode, callee);
      if (init === null || init.type !== AST_NODE_TYPES.CallExpression) return false;
      const binding = resolveModuleBinding(init.callee, context.sourceCode.getScope(init));
      return binding?.module === 'module' && binding.path.join('.') === 'createRequire';
    };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        checkSpecifier(node, node.source.value);
      },

      /**
       * `export { x } from 'loadsh'` / `export * from 'loadsh'`.
       *
       * A barrel file is where a modern codebase writes dependency names most
       * often, and a re-export is a module LOAD — the impostor is installed and
       * executed exactly as an import would install and execute it. The rule
       * had no visitor that could ever see one.
       */
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // `export const x = 1` has no source and loads nothing.
        if (node.source === null) return;
        checkSpecifier(node, node.source.value);
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        checkSpecifier(node, node.source.value);
      },

      // import reqeust = require('reqeust')
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        const ref = node.moduleReference;
        // `import A = B.C` aliases a namespace and loads nothing.
        if (ref.type !== AST_NODE_TYPES.TSExternalModuleReference) return;
        // TypeScript's grammar only admits a string literal here, so the value
        // is read straight through — a `type !== Literal` branch here is one no
        // parser can reach.
        checkSpecifier(node, ref.expression.value);
      },

      // await import('reqeust')
      ImportExpression(node: TSESTree.ImportExpression) {
        checkExpression(node, node.source);
      },

      // require('reqeust')
      CallExpression(node: TSESTree.CallExpression) {
        if (!isModuleLoader(node.callee)) return;
        const [arg] = node.arguments;
        if (arg === undefined) return;
        checkExpression(node, arg);
      },
    };
  },
});

