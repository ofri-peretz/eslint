/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-dynamic-require
 * Detects dynamic require() calls that could lead to code injection
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { makeReadsTaintSource } from '../../utils/provenance';

type MessageIds = 'unsafeDynamicRequire';

export interface Options {
  /** Allow dynamic import() expressions. Default: false (stricter) */
  allowDynamicImport?: boolean;

  /**
   * Identifier roots treated as attacker-reachable.
   * Default: `['req', 'request', 'ctx', 'event', 'process']`.
   *
   * `process` is included: `require(process.argv[2])` really is a module path
   * named from outside the program.
   */
  taintSources?: string[];

  /**
   * Report a specifier whose provenance cannot be resolved — a bare parameter,
   * an opaque helper's return value. Default: `false`.
   *
   * `true` restores the pre-inversion behaviour: report unless the argument is
   * literally a string literal. Measured on an 8-repo corpus that produced 14
   * findings, all of them build tooling resolving their own repo's files.
   */
  reportUnresolvedSpecifiers?: boolean;
}

type RuleOptions = [Options?];

/**
 * Roots an attacker can actually name a module through.
 */
const DEFAULT_TAINT_SOURCES = ['req', 'request', 'ctx', 'event', 'process'];

export const noUnsafeDynamicRequire = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-dynamic-require',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-unsafe-dynamic-require.md',
      description: 'Prevent unsafe dynamic require() calls that could enable code injection',
      cwe: 'CWE-95',
      cvss: 9.8,
    },
    hasSuggestions: false,
    messages: {
      unsafeDynamicRequire: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic require()',
        cwe: 'CWE-95',
        description: 'Dynamic require() detected',
        severity: 'CRITICAL',
        fix: 'Use allowlist: const ALLOWED = ["mod1", "mod2"]; if (!ALLOWED.includes(name)) throw Error("Not allowed")',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowDynamicImport: {
            type: 'boolean',
            default: false,
          },
          taintSources: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_TAINT_SOURCES,
            description:
              'Identifier roots treated as attacker-reachable (default: req, request, ctx, event, process)',
          },
          reportUnresolvedSpecifiers: {
            type: 'boolean',
            default: false,
            description:
              'Report specifiers whose provenance cannot be resolved. Restores the pre-inversion "any non-literal is dangerous" behaviour.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowDynamicImport: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] ?? {};
    const readsTaintSource = makeReadsTaintSource(
      context.sourceCode,
      new Set((options.taintSources ?? DEFAULT_TAINT_SOURCES).map((s) => s.toLowerCase())),
    );
    const reportUnresolvedSpecifiers = options.reportUnresolvedSpecifiers ?? false;


    /**
     * Track variables that reference require
     * Maps variable name to the node where it was assigned
     */
    const requireVariables = new Set<string>();

    /**
     * Check if a node is a reference to require
     */
    const isRequireReference = (node: TSESTree.Node): boolean => {
      if (node.type === 'Identifier' && node.name === 'require') {
        return true;
      }
      if (node.type === 'Identifier' && requireVariables.has(node.name)) {
        return true;
      }
      return false;
    };

    /**
     * Is this specifier worth reporting?
     *
     * INVERTED, following `detect-non-literal-fs-filename`. The rule used to be
     *
     *     if (arg.type === 'Literal') return false;
     *     return true;   // "any non-literal is dangerous"
     *
     * which asks "can I PROVE this is constant?" and reports whenever it
     * cannot. Measured over an 8-repo corpus that produced 14 findings and zero
     * code injections. Every one was build tooling naming a file in its own
     * repo: `require(path.resolve(ROOT, 'package.json'))`,
     * `require(path.join('..', '..', 'examples', name))`,
     * `require(ROOT_DIR + '/package.json')`.
     *
     * Adding constant-recognition for each of those shapes does not fix it,
     * because the question is backwards. CWE-95 needs an attacker to NAME the
     * module, so that is what is asked now.
     *
     * Stated plainly, the trade: `require(specifier)` where `specifier` is a
     * bare parameter is now silent — that is a caller-side decision this rule
     * cannot see. `reportUnresolvedSpecifiers` restores the old sweep.
     */
    const isDangerousSpecifier = (arg: TSESTree.Expression): boolean => {
      if (arg.type === 'Literal') return false;
      if (arg.type === 'TemplateLiteral' && arg.expressions.length === 0) return false;
      if (readsTaintSource(arg)) return true;
      return reportUnresolvedSpecifiers;
    };

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        // Track when require is assigned to a variable
        if (node.id.type === 'Identifier' && node.init) {
          if (node.init.type === 'Identifier' && node.init.name === 'require') {
            requireVariables.add(node.id.name);
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check for require() calls (direct or via variable)
        if (node.callee.type !== 'Identifier') {
          return;
        }

        // Check if callee is require or a variable that references require
        if (!isRequireReference(node.callee)) {
          return;
        }

        // Must have at least one argument
        if (node.arguments.length === 0) return;

        const firstArg = node.arguments[0];
        if (firstArg.type === 'SpreadElement') return;

        // Report only on evidence that an attacker names the module.
        if (!isDangerousSpecifier(firstArg)) return;

        context.report({
          node,
          messageId: 'unsafeDynamicRequire',
        });
      },
    };
  },
});

