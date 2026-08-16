/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-dynamic-require
 * Forbid `require()` calls with expressions (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, isStaticExpression } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'dynamicRequire';

export interface Options {
  /** Allow dynamic requires in specific contexts. Default: `[]` */
  allowContexts?: ('test' | 'config' | 'build' | 'runtime')[];
  /**
   * Regex patterns matched against the SOURCE TEXT of the require argument. A
   * match suppresses the report. Default: `[]`.
   *
   * Was declared here, in the schema and in `defaultOptions`, and read by
   * nothing — `create()` destructured `allowContexts` alone. A consumer who
   * configured it got no suppression and no complaint. Now implemented.
   */
  allowPatterns?: string[];
}

type RuleOptions = [Options?];

export const noDynamicRequire = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-require',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-dynamic-require.md',
      description:
        'Forbid `require()` calls with expressions',
      cwe: 'CWE-94',
      cweJustification: 'CWE-94 (Improper Control of Generation of Code) — dynamic require with attacker-influenced path can load arbitrary modules, equivalent to remote code execution.',
      confidence: 'high',
    },
    hasSuggestions: false,
    messages: {
      dynamicRequire: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Dynamic Require',
        // `meta.docs.cwe` is documentation; the formatter enriches CVSS and the OWASP
        // category from the cwe passed HERE. Declaring it in one place and not the other
        // left this the only rule of 121 quoting no CVSS.
        cwe: 'CWE-94',
        description: 'Require call uses dynamic expression',
        severity: 'HIGH',
        fix: 'Use static string literals for require() calls',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-dynamic-require.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowContexts: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['test', 'config', 'build', 'runtime'],
            },
            default: [],
            description: 'Allow dynamic requires in specific contexts.',
          },
          allowPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Regex patterns matched against the source text of the require argument; a match suppresses the report.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allowContexts: [],
    allowPatterns: []
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allowContexts = [],
      allowPatterns = [],
    } = options || {};

    const filename = context.filename || '';

    // Compiled once per file rather than once per `require()`. A rule that
    // rebuilds a RegExp inside a visitor pays for it on every node.
    const allowed = allowPatterns.map((pattern) => new RegExp(pattern));

    function isInAllowedContext(): boolean {
      if (allowContexts.includes('test') && (filename.includes('.test.') || filename.includes('.spec.') || filename.includes('/__tests__/'))) {
        return true;
      }

      if (allowContexts.includes('config') && (filename.includes('config') || filename.includes('webpack') || filename.includes('rollup'))) {
        return true;
      }

      if (allowContexts.includes('build') && (filename.includes('build') || filename.includes('scripts') || filename.includes('tools'))) {
        return true;
      }

      if (allowContexts.includes('runtime') && (filename.includes('runtime') || filename.includes('dynamic'))) {
        return true;
      }

      return false;
    }

    /**
     * A specifier is safe when nothing can change it, not when it is spelled as a
     * literal. `require(`b`)`, `require(`lodash/${d}`)` with `const d = 'debounce'`
     * and `require(__dirname + '/utils')` are all fixed at build time — and all three
     * are cases eslint-plugin-security's own corpus marks valid, which we reported.
     */
    function isFixedSpecifier(node: TSESTree.Node): boolean {
      return isStaticExpression({ node, scope: context.sourceCode.getScope(node) });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const requireArg = node.arguments[0];

          if (isInAllowedContext()) {
            return;
          }

          // Nothing an attacker can steer — a literal, a const chain, `__dirname`.
          if (isFixedSpecifier(requireArg)) {
            return;
          }

          // An explicitly allowed shape. Matched against the SOURCE TEXT of the
          // argument, because the whole point of the option is to describe
          // expressions the rule cannot resolve — `require(\`./locales/${lang}\`)`
          // — which have no value to match against.
          //
          // Text matching in a rule is normally forbidden here (see CLAUDE.md,
          // "AST, not printed source"). Two things make this the exception, and
          // both must hold: the pattern comes from the CONSUMER, not from a
          // vocabulary baked into the rule, and it can only ever SUPPRESS. A
          // text match that suppresses costs recall in the config that asked
          // for it; a text match that reports costs a stranger's trust. Only
          // the second is the defect class the doctrine is about.
          if (allowed.length > 0) {
            const text = context.sourceCode.getText(requireArg);
            if (allowed.some((pattern) => pattern.test(text))) {
              return;
            }
          }

          // Report dynamic require
          context.report({
            node: requireArg,
            messageId: 'dynamicRequire',
          });
        }
      },
    };
  },
});
