/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent dynamic dependency injection
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/494.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  isStaticExpression,
  MessageIcons,
  resolveModuleBinding,
  unwrapTypeSyntax,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

import { constInitializerOf } from '../../utils/const-value';

/**
 * Is this member expression one of CommonJS's other loader entry points?
 *
 * `module.require(x)` and `require.main.require(x)` are documented Node APIs
 * that resolve a specifier against a *different* module's paths — which is
 * exactly why plugin hosts reach for them. The receiver is matched by shape,
 * not by "does the property happen to be called require": `bundler.require(x)`
 * on some unrelated object is not a module load and must stay quiet.
 */
function isLoaderMember(node: TSESTree.MemberExpression): boolean {
  // `module['require'](x)` loads the same module.
  if (propertyName(node) !== 'require') return false;

  const { object } = node;
  // module.require(x)
  if (object.type === AST_NODE_TYPES.Identifier) return object.name === 'module';
  // require.main.require(x)
  if (object.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (propertyName(object) !== 'main') return false;
  return object.object.type === AST_NODE_TYPES.Identifier && object.object.name === 'require';
}

/**
 * Does this expression evaluate to the CommonJS loader, written directly?
 *
 * `(0, require)(name)` is the standard idiom for hiding a specifier from a
 * bundler's static analysis — reached for precisely when the author wants a
 * specifier the toolchain cannot see, which is the case this rule exists for.
 */
function isLoaderExpression(node: TSESTree.Node): boolean {
  const target = unwrapTypeSyntax(node);
  if (target.type === AST_NODE_TYPES.SequenceExpression) {
    return isLoaderExpression(target.expressions[target.expressions.length - 1]);
  }
  if (target.type === AST_NODE_TYPES.MemberExpression) return isLoaderMember(target);
  return target.type === AST_NODE_TYPES.Identifier && target.name === 'require';
}

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noDynamicDependencyLoading = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-dependency-loading',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-dynamic-dependency-loading.md',
      description: 'Prevent runtime dependency injection with dynamic paths',
      cwe: 'CWE-1104',
      cvss: 5.3,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-1104',
        description: 'Dynamic import/require detected - use static imports for security',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/1104.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    /**
     * "Not a string literal" is not the same question as "can an attacker steer it".
     * `require(`b`)`, `require(`lodash/${d}`)` with `const d = 'debounce'`, and
     * `require(__dirname + '/utils')` are all fixed at build time and all three are
     * cases eslint-plugin-security's own corpus marks valid — we reported every one.
     * `isStaticExpression` resolves const bindings, template parts and concatenation
     * through ESLint's scope analysis, so the module specifier is judged by whether it
     * can change, not by its node type.
     */
    const isSteerable = (node: TSESTree.Node): boolean =>
      !isStaticExpression({ node, scope: context.sourceCode.getScope(node) });

    /**
     * Is this callee the CommonJS loader, however it was spelled or bound?
     *
     * The rule used to test `callee.name === 'require'` and nothing else, so
     * three loaders that Node itself documents were invisible to it:
     * `module.require`, `require.main.require`, and a binding initialised from
     * `module.createRequire()` — the sanctioned way an ESM file loads CJS, and
     * therefore the spelling a modern codebase actually uses. `(0, require)`
     * was invisible for the same reason, and that one is reached for *because*
     * static analysis cannot see it.
     *
     * A binding is followed through ONE `const` hop and resolved with
     * `resolveModuleBinding`, so the answer comes from where the value came
     * from, never from how the local variable happens to be spelled.
     */
    const isModuleLoader = (callee: TSESTree.Node): boolean => {
      if (isLoaderExpression(callee)) return true;

      const target = unwrapTypeSyntax(callee);
      if (target.type !== AST_NODE_TYPES.Identifier) return false;
      const init = constInitializerOf(context.sourceCode, target);
      if (init === null) return false;
      if (init.type !== AST_NODE_TYPES.CallExpression) return isLoaderExpression(init);

      const binding = resolveModuleBinding(init.callee, context.sourceCode.getScope(init));
      return binding?.module === 'module' && binding.path.join('.') === 'createRequire';
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Dynamic require
        const specifier = node.arguments[0];
        if (specifier !== undefined && isModuleLoader(node.callee) && isSteerable(specifier)) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        // Dynamic import()
        if (isSteerable(node.source)) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
   };
  },
});

